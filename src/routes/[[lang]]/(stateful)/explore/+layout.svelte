<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/state';
  import { getAllListedGardens, getGarden } from '$lib/api/garden';
  import { allListedGardens, filteredGardens, isFetchingGardens } from '$lib/stores/garden';
  import routes from '$lib/routes';
  import Map, { currentPosition, mapState } from '$lib/components/Map/Map.svelte';
  import GardenDrawer from '$lib/components/Garden/GardenDrawer.svelte';
  import GardenLayer from '$lib/components/Map/GardenLayer.svelte';
  import WaymarkedTrails from '$lib/components/Map/WaymarkedTrails.svelte';
  import Filter from '$lib/components/Garden/Filter.svelte';
  import { Progress } from '$lib/components/UI';
  import { getCookie } from '$lib/util';
  import {
    LOCATION_BELGIUM,
    LOCATION_WESTERN_EUROPE,
    memberMaxZoom,
    nonMemberMaxZoom,
    ZOOM_LEVELS
  } from '$lib/constants';
  import LayersAndTools from '$lib/components/LayersAndTools/LayersAndTools.svelte';
  import FileTrailModal from '$lib/components/Map/FileTrailModal.svelte';
  import FileTrails from '$lib/components/Map/FileTrails.svelte';
  import type { Garden, LongLat } from '$lib/types/Garden';
  import { savedGardens as savedGardenStore } from '$lib/stores/savedGardens';
  import TrainAndRails from '$lib/components/Map/TrainAndRails.svelte';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { setExpiringCookie } from '$lib/util/set-cookie';
  import ZoomRestrictionNotice from '$lib/components/Map/ZoomRestrictionNotice.svelte';
  import { createTrailObserver } from '$lib/api/trail';
  import { user } from '$lib/stores/auth';
  import { isOnIDevicePWA } from '$lib/util/push-registrations';
  import type { Unsubscribe } from 'firebase/firestore';
  import { fileDataLayers, removeTrailAnimations } from '$lib/stores/file';
  import { isEmpty } from 'lodash-es';
  import MeetupLayer, { meetups } from '$lib/components/Map/MeetupLayer.svelte';
  import { lnglatToObject } from '$lib/api/mapbox';
  import MeetupDrawer from '$lib/components/Map/MeetupDrawer.svelte';
  import MembershipModal from '$lib/components/Membership/MembershipModal.svelte';
  import { lr } from '$lib/util/translation-helpers';
  import logger from '$lib/util/logger';
  import { pushState } from '$app/navigation';
  import createUrl from '$lib/util/create-url';
  import VehicleNotice from './VehicleNotice.svelte';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let showHiking = $state(false);
  let showCycling = $state(false);
  let showFileTrailModal = $state(false);
  let showGardens = $state(true);
  // By default, don't show saved gardens
  let showSavedGardens = $state(false);
  let showTransport = $state(false);
  let savedGardens = $state([] as string[]);
  let vehicleNoticeShown = $state(!isOnIDevicePWA() && !getCookie('car-notice-dismissed'));

  function showMembershipModal(gardenUrl?: string) {
    if (gardenUrl) {
      membershipModalContinueUrl = gardenUrl;
    }
    pushState(createUrl($lr(routes.ABOUT_MEMBERSHIP), {}, 'pricing'), {
      showMembershipModal: true
    });
  }

  let isShowingMembershipModal = $derived(page.state.showMembershipModal ?? false);

  let membershipModalContinueUrl: undefined | string = $state();

  let unsubscribeFromTrailObserver: null | Unsubscribe = $state(null);

  // TODO: this works for now, because the default state when loading the
  // page is that the checkboxes are unchecked. We may want to intercept actual
  // clicks/actions on the button.
  $effect(() => {
    if (showHiking) {
      trackEvent(PlausibleEvent.SHOW_HIKING_ROUTES);
    }
    if (showCycling) {
      trackEvent(PlausibleEvent.SHOW_CYCLING_ROUTES);
    }
    if (showTransport) {
      trackEvent(PlausibleEvent.SHOW_TRAIN_NETWORK);
    }

    if ($user && $user.superfan) {
      // Combining this conditions with the above one somehow doesn't work.
      if (!unsubscribeFromTrailObserver) {
        unsubscribeFromTrailObserver = createTrailObserver();
      }
    }
    // If the user is not a Superfan anymore, but trails are being listened for, then clear the trails + listener.
    if ($user && !$user.superfan) {
      if (unsubscribeFromTrailObserver) {
        fileDataLayers.set([]);
        unsubscribeFromTrailObserver();
        unsubscribeFromTrailObserver = null;
      }
    }
  });

  /**
   * Whether this page was loaded from a URL with a garden in it
   */
  let isShowingGardenOnInit = $state(!!page.params.gardenId);

  // reactivity seems to be necessary here!
  let selectedMeetupId = $derived(page.params.meetupId);
  let selectedMeetup = $derived(meetups.find((m) => m.id === selectedMeetupId));

  let zoom = $state(isShowingGardenOnInit ? ZOOM_LEVELS.ROAD : ZOOM_LEVELS.WESTERN_EUROPE);
  let applyZoom = $state(isShowingGardenOnInit ? true : false);

  // Garden to preload when we are loading the app on its permalink URL
  let preloadedGarden: Garden | null = $state(null);

  let selectedGarden: Garden | null = $derived.by(() => {
    // Select the preloaded garden if it matches the current URL
    if (preloadedGarden?.id === page.params.gardenId) {
      return preloadedGarden;
    }
    // Select a garden when the URL changes, but only if all gardens are loaded and the garden is not selected yet.
    if (!isEmpty($allListedGardens)) {
      return $allListedGardens.find((g) => g.id === page.params.gardenId) ?? null;
    }
    return null;
  });

  // This variable controls the location of the map.
  // Don't make it reactive based on its params, so that it can be imperatively controlled.
  // This is useful to not recenter the map after defocussing a selected garden
  let centerLocation = $state(LOCATION_WESTERN_EUROPE);

  const setMapToGardenLocation = (garden: Garden) => {
    centerLocation = garden.location!;
  };

  const unsubscribeFromSavedGardens = savedGardenStore.subscribe((gardens) => {
    if (Array.isArray(gardens)) savedGardens = gardens;
    else savedGardens = [];
  });

  // FUNCTIONS

  const selectGarden = (garden: Garden) => {
    // We're switching to non-direct loading by clicking a garden on the map
    isShowingGardenOnInit = false;

    const newSelectedId = garden.id;
    const newGarden = $allListedGardens.find((g) => g.id === newSelectedId);
    if (newGarden) {
      setMapToGardenLocation(newGarden);
      applyZoom = false; // zoom level is not programatically changed when exploring a garden
      goto($lr(`${routes.MAP}/garden/${newSelectedId}`));
    } else {
      logger.warn(`Failed garden navigation to ${newSelectedId}`);
    }
  };

  const selectMeetup = (meetupId: string) => {
    const meetup = meetups.find((m) => m.id === meetupId);
    if (meetup) {
      centerLocation = lnglatToObject(meetup.lnglat);
      goto($lr(`${routes.MAP}/meetup/${meetup.id}`));
    }
  };

  const goToPlace = (event: LongLat) => {
    zoom = ZOOM_LEVELS.CITY;
    applyZoom = true;
    centerLocation = { longitude: event.longitude, latitude: event.latitude };
  };

  const closeDrawer = () => {
    goto($lr(routes.MAP));
  };

  const closeCarNotice = () => {
    // Set a cookie for one year
    setExpiringCookie('car-notice-dismissed', true, 24 * 365);
    vehicleNoticeShown = false;
  };

  let fetchError = '';

  // LIFECYCLE HOOKS

  onMount(async () => {
    // Called every time the page opens, but not when the selected garden changes (client-side navigation within this layout)

    const gardensAreEmpty = $allListedGardens.length === 0;

    // If we open the map with a garden in the URL, and gardens aren't loaded yet (or loading),
    // load that one immediately *before* all other gardens.
    //
    // Note that all gardens are fetched at the end of this function on a fresh/hard navigation, but it may also be possible that
    // onMount() is called in a soft client-side navigation, after gardens have already been loaded.
    if (gardensAreEmpty && !$isFetchingGardens && isShowingGardenOnInit) {
      preloadedGarden = await getGarden(page.params.gardenId);
    }

    // In any case where we open the map with a garden in the URL, move the map view to that garden
    if (isShowingGardenOnInit && (!gardensAreEmpty || preloadedGarden)) {
      // In one case, all gardens are already loaded before the page mount. In another, we've preloaded the target here above.
      const targetGarden =
        $allListedGardens.find((g) => g.id === page.params.gardenId) || preloadedGarden;
      if (targetGarden) {
        // the target garden exists
        if (typeof $mapState?.zoom === 'number' && $mapState?.gardenId === page.params.gardenId) {
          // Restore the zoom level & position in case we're returning to the same garden we left before
          // in the session
          zoom = $mapState.zoom;
          centerLocation = lnglatToObject($mapState.center.toArray() as [number, number]);
        } else {
          setMapToGardenLocation(targetGarden);
        }
      }
    } else if (!isShowingGardenOnInit && $mapState) {
      // No garden in the URL, restore state if it exists
      zoom = $mapState.zoom;
      centerLocation = lnglatToObject($mapState.center.toArray() as [number, number]);
    }

    // Fetch all gardens if they are not loaded yet, every time the map opens
    if (gardensAreEmpty && !$isFetchingGardens) {
      await getAllListedGardens().catch((ex) => {
        logger.error(ex);
        fetchError = 'Error' + ex;
        isFetchingGardens.set(false);
      });
    }
  });

  onDestroy(() => {
    isFetchingGardens.set(false);
    unsubscribeFromSavedGardens();
    if (unsubscribeFromTrailObserver) {
      unsubscribeFromTrailObserver();
    }
    // On SPA navigation, when coming back, don't animate to an added trail anymore
    removeTrailAnimations();
  });
</script>

<Progress active={$isFetchingGardens} />

<div class="map-section">
  <Map
    lon={centerLocation.longitude}
    lat={centerLocation.latitude}
    maxZoom={$user?.superfan ? memberMaxZoom : nonMemberMaxZoom}
    recenterOnUpdate
    enableFullscreen
    {isShowingGardenOnInit}
    {zoom}
    {applyZoom}
  >
    <TrainAndRails {showTransport} />
    {#if !isEmpty($allListedGardens)}
      <GardenLayer
        {showGardens}
        {showSavedGardens}
        onGardenClick={selectGarden}
        selectedGardenId={selectedGarden ? selectedGarden.id : null}
        allGardens={$filteredGardens}
        {savedGardens}
      />
    {/if}
    <GardenDrawer
      onclose={closeDrawer}
      onOpenMembershipModal={(gardenUrl) => showMembershipModal(gardenUrl)}
      {isShowingMembershipModal}
      garden={selectedGarden}
    />
    <MeetupDrawer onclose={closeDrawer} meetup={selectedMeetup} />
    <WaymarkedTrails {showHiking} {showCycling} />
    <MeetupLayer onMeetupClick={selectMeetup} {selectedMeetupId} />
    {@render children?.()}
    {#if vehicleNoticeShown}
      <VehicleNotice close={closeCarNotice} />
    {/if}
    <FileTrails />
    <ZoomRestrictionNotice onclick={() => showMembershipModal()} />
  </Map>
  <LayersAndTools
    bind:showHiking
    bind:showCycling
    bind:showGardens
    bind:showSavedGardens
    bind:showTransport
    bind:showFileTrailModal
  />
  <!-- TODO: the $currentPosition should be based on IP
    (if it isn't already by default) -->
  <Filter onGoToPlace={goToPlace} closeToLocation={$currentPosition ?? LOCATION_BELGIUM} />
  <FileTrailModal bind:show={showFileTrailModal} />
  <MembershipModal
    bind:show={isShowingMembershipModal}
    continueUrl={membershipModalContinueUrl}
    onclose={() => {
      if (membershipModalContinueUrl) {
        // reset the continue URL (in case we later click on
        // the zoom notice in the same session)
        membershipModalContinueUrl = undefined;
      }
      trackEvent(PlausibleEvent.MEMBERSHIP_MODAL_BACK, {
        source: 'map_close'
      });
      history.back();
    }}
  />
</div>

<style>
  .map-section {
    width: 100%;
    height: 100%;
    top: var(--height-nav);
    left: 0;
  }

  /* TODO: unhide this attribution logo? */
  .map-section :global(.mapboxgl-ctrl-logo) {
    display: none;
  }

  .map-section :global(.mapboxgl-ctrl-top-left) {
    /* 10px is the built-in margin of the zoom control */
    top: calc(var(--spacing-map-controls) - 10px);
  }

  @media screen and (max-width: 700px) {
    .map-section {
      top: 0;
    }
    .map-section :global(.mapboxgl-ctrl-top-left) {
      top: 0rem;
    }

    .map-section :global(.mapboxgl-ctrl-attrib.mapboxgl-compact:not(.mapboxgl-compact-show)) {
      /* Fix the oval attribution info box by setting a height equal to width,
      but allow flexible height expansion when opened */
      height: 24px;
    }
  }

  /* Native override */
  :global(.app.native.ios .map-section .mapboxgl-ctrl-top-left) {
    /* 10px is the built-in margin */
    top: calc(env(safe-area-inset-top) - 10px);
  }
</style>

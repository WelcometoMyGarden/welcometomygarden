<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import { getAllListedGardens, getGarden } from '$lib/api/garden';
  import { allListedGardens, isFetchingGardens } from '$lib/stores/garden';
  import routes from '$lib/routes';
  import Map, { currentPosition } from '$lib/components/Map/Map.svelte';
  import Drawer from '$lib/components/Garden/GardenDrawer.svelte';
  import GardenLayer from '$lib/components/Map/GardenLayer.svelte';
  import WaymarkedTrails from '$lib/components/Map/WaymarkedTrails.svelte';
  import Filter from '$lib/components/Garden/Filter.svelte';
  import { Progress, Icon } from '$lib/components/UI';

  import { getCookie } from '$lib/util';
  import { crossIcon } from '$lib/images/icons';
  import {
    LOCATION_BELGIUM,
    LOCATION_WESTERN_EUROPE,
    memberMaxZoom,
    nonMemberMaxZoom,
    ZOOM_LEVELS
  } from '$lib/constants';
  import LayersAndTools from '$lib/components/LayersAndTools/LayersAndTools.svelte';
  import FileTrailModal from '$lib/components/Map/FileTrailModal.svelte';
  import TrainConnectionsModal from '$lib/components/Map/TrainConnectionsModal.svelte';
  import FileTrails from '$lib/components/Map/FileTrails.svelte';
  import type { Garden } from '$lib/types/Garden';
  import { savedGardens as savedGardenStore } from '$lib/stores/savedGardens';
  import TrainconnectionsLayer from '$lib/components/Map/TrainconnectionsLayer.svelte';
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
  import MembershipModal from '$routes/(marketing)/(membership)/MembershipModal.svelte';
  import { coerceToMainLanguage } from '$lib/util/get-browser-lang';
  import { get } from 'svelte/store';

  let showHiking = false;
  let showCycling = false;
  let showFileTrailModal = false;
  let showTrainConnectionsModal = false;
  let showGardens = true;
  let showSavedGardens = true;
  let showStations = false;
  let showRails = false;
  let showTransport = false;
  let filteredGardens: Garden[];
  let savedGardens = [] as string[];
  let carNoticeShown = !isOnIDevicePWA() && !getCookie('car-notice-dismissed');
  let showMembershipModal = false;

  let npsSurveySubmitted = false;

  // TODO: this works for now, because the default state when loading the
  // page is that the checkboxes are unchecked. We may want to intercept actual
  // clicks/actions on the button.
  $: if (showHiking) {
    trackEvent(PlausibleEvent.SHOW_HIKING_ROUTES);
  }
  $: if (showCycling) {
    trackEvent(PlausibleEvent.SHOW_CYCLING_ROUTES);
  }

  $: if (showTransport) {
    trackEvent(PlausibleEvent.SHOW_TRAIN_NETWORK);
  }

  let unsubscribeFromTrailObserver: null | Unsubscribe = null;
  $: if ($user && $user.superfan) {
    // Combining this conditions with the above one somehow doesn't work.
    if (!unsubscribeFromTrailObserver) {
      unsubscribeFromTrailObserver = createTrailObserver();
    }
  }

  // If the user is not a Superfan anymore, but trails are being listened for, then clear the trails + listener.
  $: if ($user && !$user.superfan) {
    if (unsubscribeFromTrailObserver) {
      fileDataLayers.set([]);
      unsubscribeFromTrailObserver();
      unsubscribeFromTrailObserver = null;
    }
  }

  // true when visiting the link to a garden directly, used to increase zoom level
  // TODO check this: It looks like there is no need for a subscribe on page
  let hasGardenInURL = !!$page.params.gardenId;

  // reactivity seems to be necessary here!
  $: selectedMeetupId = $page.params.meetupId;
  $: selectedMeetup = meetups.find((m) => m.id === selectedMeetupId);

  let zoom = hasGardenInURL ? ZOOM_LEVELS.ROAD : ZOOM_LEVELS.WESTERN_EUROPE;

  $: applyZoom = hasGardenInURL ? true : false;

  // Garden to preload when we are loading the app on its permalink URL
  let preloadedGarden: Garden | null = null;

  /**
   * @type {Garden | null}
   */
  let selectedGarden = null;

  // Select the preloaded garden if it matches the current URL, but only if it was not selected yet.
  $: if (
    preloadedGarden?.id === $page.params.gardenId &&
    selectedGarden?.id !== preloadedGarden?.id
  ) {
    selectedGarden = preloadedGarden;
  }

  // Select a garden when the URL changes, but only if all gardens are loaded and the garden is not selected yet.
  $: if (!isEmpty($allListedGardens) && $page.params.gardenId !== selectedGarden?.id) {
    selectedGarden = $allListedGardens.find((g) => g.id === $page.params.gardenId) ?? null;
  }

  // This variable controls the location of the map.
  // Don't make it reactive based on its params, so that it can be imperatively controlled.
  // This is useful to not recenter the map after defocussing a selected garden
  let centerLocation = selectedGarden?.location ?? LOCATION_WESTERN_EUROPE;

  const setMapToGardenLocation = (garden: Garden) => {
    centerLocation = garden.location!;
  };

  const unsubscribeFromSavedGardens = savedGardenStore.subscribe((gardens) => {
    if (Array.isArray(gardens)) savedGardens = gardens;
    else savedGardens = [];
  });

  // FUNCTIONS

  const selectGarden = (garden) => {
    const newSelectedId = garden.id;
    const newGarden = $allListedGardens.find((g) => g.id === newSelectedId);
    if (newGarden) {
      setMapToGardenLocation(newGarden);
      applyZoom = false; // zoom level is not programatically changed when exploring a garden
      goto(`${routes.MAP}/garden/${newSelectedId}`);
    } else {
      console.warn(`Failed garden navigation to ${newSelectedId}`);
    }
  };

  const selectMeetup = (meetupId: string) => {
    const meetup = meetups.find((m) => m.id === meetupId);
    if (meetup) {
      centerLocation = lnglatToObject(meetup.lnglat);
      goto(`${routes.MAP}/meetup/${meetup.id}`);
    }
  };

  const goToPlace = (event) => {
    zoom = ZOOM_LEVELS.CITY;
    applyZoom = true;
    centerLocation = { longitude: event.detail.longitude, latitude: event.detail.latitude };
  };

  const closeDrawer = () => {
    hasGardenInURL = false;
    goto(routes.MAP);
  };

  const closeCarNotice = () => {
    // Set a cookie for one year
    setExpiringCookie('car-notice-dismissed', true, 24 * 365);
    carNoticeShown = false;
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
    if (gardensAreEmpty && !$isFetchingGardens && hasGardenInURL) {
      preloadedGarden = await getGarden($page.params.gardenId);
    }

    // In any case where we open the map with a garden in the URL, move the map view to that garden
    if (hasGardenInURL && (!gardensAreEmpty || preloadedGarden)) {
      // In one case, all gardens are already loaded before the page mount. In another, we've preloaded the target here above.
      const targetGarden =
        $allListedGardens.find((g) => g.id === $page.params.gardenId) || preloadedGarden;
      if (targetGarden) {
        setMapToGardenLocation(targetGarden);
      }
    }

    // Fetch all gardens if they are not loaded yet, every time the map opens
    if (gardensAreEmpty && !$isFetchingGardens) {
      await getAllListedGardens().catch((ex) => {
        console.error(ex);
        fetchError = 'Error' + ex;
        isFetchingGardens.set(false);
      });
    }

    const openTally = () => {
      const formId = { fr: '3lvpaV', nl: 'wLkrP1', en: 'wAyX5B' }[coerceToMainLanguage($locale)];
      let userData = get(user);
      if (
        userData &&
        userData.superfan &&
        userData.stripeSubscription &&
        userData.stripeSubscription.startDate * 1000 < Date.now() - 24 * 3600 * 1000
      ) {
        console.log('Opening Tally');
        window.Tally.openPopup(formId, {
          // width: { fr: 570, nl: 550, en: 550 }[coerceToMainLanguage($locale)],
          // this blows up the 1-10 size responsively
          width: 580,
          hideTitle: true,
          // For now!
          showOnce: true,
          doNotShowAfterSubmit: true,
          onClose: () => {
            if (!npsSurveySubmitted) {
              trackEvent(PlausibleEvent.CLOSE_NPS_SURVEY);
            }
          },
          onOpen: () => trackEvent(PlausibleEvent.SHOW_NPS_SURVEY),
          onSubmit: () => {
            npsSurveySubmitted = true;
          },
          hiddenFields: {
            name: userData?.firstName,
            wtmg: userData?.id
          }
        });
      } else {
        console.log('Tally: not a older superfan');
      }
    };

    // NOTE: to re-enable the NPS survey, also re-add
    // the script in src/routes/explore/+page.svelte
    //
    // resolveOnUserLoaded().then(() => {
    //   // Open the survey if needed
    //   if (window.Tally) {
    //     openTally();
    //   } else {
    //     console.warn('Tally not loaded on /explore mount, adding listener');
    //     document.addEventListener('tally-loaded', openTally);
    //   }
    // });
    // return () => document.removeEventListener('tally-loaded', openTally);
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
    {hasGardenInURL}
    {zoom}
    {applyZoom}
  >
    <TrainAndRails {showStations} {showRails} {showTransport} />
    {#if !isEmpty($allListedGardens)}
      <GardenLayer
        {showGardens}
        {showSavedGardens}
        on:garden-click={(e) => selectGarden(e.detail)}
        selectedGardenId={selectedGarden ? selectedGarden.id : null}
        allGardens={filteredGardens || $allListedGardens}
        {savedGardens}
      />
    {/if}
    <Drawer on:close={closeDrawer} garden={selectedGarden} />
    <MeetupDrawer on:close={closeDrawer} meetup={selectedMeetup} />
    <WaymarkedTrails {showHiking} {showCycling} />
    <MeetupLayer on:meetup-click={(e) => selectMeetup(e.detail)} {selectedMeetupId} />
    <slot />
    {#if carNoticeShown}
      <div class="vehicle-notice-wrapper">
        <button on:click={closeCarNotice} aria-label="Close notice" class="button-container close">
          <Icon icon={crossIcon} />
        </button>

        <div class="vehicle-notice">
          <div class="image-container">
            <img src="/images/no-car.svg" alt="No vehicle allowed" />
          </div>
          <h3>{$_('map.vehicle-notice.title')}</h3>
          <p class="mt-m">{$_('map.vehicle-notice.text')}</p>
        </div>
      </div>
    {/if}
    <FileTrails />
    <TrainconnectionsLayer />
    <ZoomRestrictionNotice on:click={() => (showMembershipModal = true)} />
  </Map>
  <LayersAndTools
    bind:showHiking
    bind:showCycling
    bind:showGardens
    bind:showSavedGardens
    bind:showStations
    bind:showRails
    bind:showTransport
    bind:showFileTrailModal
    bind:showTrainConnectionsModal
  />
  <!-- TODO: the $currentPosition should be based on IP
    (if it isn't already by default) -->
  <Filter
    on:goToPlace={goToPlace}
    bind:filteredGardens
    closeToLocation={$currentPosition ?? LOCATION_BELGIUM}
  />
  <FileTrailModal bind:show={showFileTrailModal} />
  <TrainConnectionsModal bind:show={showTrainConnectionsModal} />
  <MembershipModal
    bind:show={showMembershipModal}
    on:close={() =>
      trackEvent(PlausibleEvent.MEMBERSHIP_MODAL_BACK, {
        source: 'map_close'
      })}
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

  .vehicle-notice-wrapper {
    width: 45rem;
    height: 30rem;
    box-shadow: 0px 0px 21.5877px rgba(0, 0, 0, 0.1);
    position: fixed;
    bottom: var(--height-footer);
    left: 0;
    background-color: var(--color-white);
    border-radius: 0.6rem;
    z-index: 20;
  }

  .vehicle-notice {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
    font-family: var(--fonts-copy);
    width: 100%;
    height: 100%;
  }

  .vehicle-notice h3 {
    font-size: 1.8rem;
    line-height: 1.4;
    text-transform: uppercase;
    position: relative;
    font-weight: 700;
  }

  .vehicle-notice h3::after {
    content: '';
    width: 16rem;
    position: absolute;
    bottom: -1rem;
    left: calc(50% - 8rem);
    height: 0.4rem;
    background: var(--color-orange-light);
    border-radius: 0.5rem;
  }

  .vehicle-notice p {
    font-size: 1.4rem;
  }

  .vehicle-notice .image-container {
    width: 10rem;
    height: 10rem;
  }

  .vehicle-notice .image-container img {
    max-width: 100%;
  }

  .close {
    width: 3.6rem;
    height: 3.6rem;
    position: absolute;
    right: 1.2rem;
    top: 1.2rem;
    cursor: pointer;
    z-index: 10;
  }

  @media screen and (max-width: 700px) {
    .map-section {
      top: 0;
    }
    .map-section :global(.mapboxgl-ctrl-top-left) {
      top: 0rem;
    }

    .map-section :global(.maplibregl-ctrl-attrib.maplibregl-compact:not(.mapboxgl-compact-show)) {
      /* Fix the oval attribution info box by setting a height equal to width,
      but allow flexible height expansion when opened */
      height: 24px;
    }

    .vehicle-notice-wrapper {
      top: 2rem;
      left: calc(50% - 22.5rem);
    }
  }

  @media screen and (max-width: 500px) {
    .vehicle-notice-wrapper {
      width: 90%;
      left: 5%;
      height: 24rem;
    }

    .vehicle-notice {
      padding: 3rem 2rem 1rem;
    }

    .image-container {
      display: none;
    }
  }

  @media screen and (max-width: 400px) {
    .vehicle-notice-wrapper {
      height: 28rem;
    }
  }

  @media (max-width: 576px) {
    :global(.tally-popup) {
      max-width: calc(100% - 20px) !important;
      right: 10px !important;
      bottom: 10px !important;
    }
  }
</style>

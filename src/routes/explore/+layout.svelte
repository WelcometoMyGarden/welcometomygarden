<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import { getAllListedGardens } from '$lib/api/garden';
  import { allGardens, isFetchingGardens } from '$lib/stores/garden';
  import routes from '$lib/routes';
  import Map from '$lib/components/Map/Map.svelte';
  import Drawer from '$lib/components/Garden/GardenDrawer.svelte';
  import GardenLayer from '$lib/components/Map/GardenLayer.svelte';
  import WaymarkedTrails from '$lib/components/Map/WaymarkedTrails.svelte';
  import Filter from '$lib/components/Garden/Filter.svelte';
  import { Progress, Icon } from '$lib/components/UI';

  import { getCookie } from '$lib/util';
  import { crossIcon } from '$lib/images/icons';
  import { ZOOM_LEVELS } from '$lib/constants';
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
  import type { Unsubscribe } from 'firebase/firestore';
  import { fileDataLayers, removeTrailAnimations } from '$lib/stores/file';

  let fallbackLocation = { longitude: 4.5, latitude: 50.5 };
  let geolocationIsLoaded = false;
  let showHiking = false;
  let showCycling = false;
  let showFileTrailModal = false;
  let showTrainConnectionsModal = false;
  let showGardens = true;
  let showSavedGardens = true;
  let showStations = false;
  let showRails = false;
  let showTransport = false;
  let filteredGardens: { [id: string]: Garden };
  let savedGardens = [] as string[];
  let carNoticeShown = !getCookie('car-notice-dismissed');

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
  let usingGardenLink = !!$page.params.gardenId;

  let zoom = usingGardenLink ? ZOOM_LEVELS.ROAD : ZOOM_LEVELS.SMALL_COUNTRY;

  $: applyZoom = usingGardenLink ? true : false;
  $: selectedGarden = $isFetchingGardens ? null : $allGardens[$page.params.gardenId];
  $: center = selectedGarden
    ? { longitude: selectedGarden.location.longitude, latitude: selectedGarden.location.latitude }
    : fallbackLocation;

  const unsubscribeFromSavedGardens = savedGardenStore.subscribe((gardens) => {
    if (Array.isArray(gardens)) savedGardens = gardens;
    else savedGardens = [];
  });

  // FUNCTIONS

  const selectGarden = (garden) => {
    const newSelectedId = garden.id;
    const newGarden = $allGardens[newSelectedId];
    center = { longitude: newGarden.location.longitude, latitude: newGarden.location.latitude };
    applyZoom = false; // zoom level is not programatically changed when exploring a garden
    goto(`${routes.MAP}/garden/${newSelectedId}`);
  };

  const goToPlace = (event) => {
    zoom = ZOOM_LEVELS.CITY;
    applyZoom = true;
    center = { longitude: event.detail.longitude, latitude: event.detail.latitude };
  };

  const closeDrawer = () => {
    usingGardenLink = false;

    goto(routes.MAP);
  };

  const closeCarNotice = () => {
    // Set a cookie for one year
    setExpiringCookie('car-notice-dismissed', true, 24 * 365);
    carNoticeShown = false;
  };

  // LIFECYCLE HOOKS

  onMount(async () => {
    if (Object.keys($allGardens).length === 0) {
      try {
        await getAllListedGardens();
      } catch (ex) {
        console.error(ex);
        isFetchingGardens.set(false);
      }
    }

    if (!geolocationIsLoaded && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fallbackLocation = { longitude: pos.coords.longitude, latitude: pos.coords.latitude };
          geolocationIsLoaded = true;
        },
        (err) => {
          console.log(err);
          geolocationIsLoaded = true;
        }
      );
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

<Progress active={$isFetchingGardens && !geolocationIsLoaded} />

<div class="map-section">
  <Map
    lon={center.longitude}
    lat={center.latitude}
    recenterOnUpdate
    initialLon={fallbackLocation.longitude}
    initialLat={fallbackLocation.latitude}
    jump={usingGardenLink}
    {zoom}
    {applyZoom}
  >
    <TrainAndRails {showStations} {showRails} {showTransport} />
    {#if !$isFetchingGardens}
      <GardenLayer
        {showGardens}
        {showSavedGardens}
        on:garden-click={(e) => selectGarden(e.detail)}
        selectedGardenId={selectedGarden ? selectedGarden.id : null}
        allGardens={filteredGardens || $allGardens}
        {savedGardens}
      />
      <Drawer on:close={closeDrawer} garden={selectedGarden} />
      <WaymarkedTrails {showHiking} {showCycling} />
      <slot />
    {/if}
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
    <ZoomRestrictionNotice />
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
  <Filter on:goToPlace={goToPlace} bind:filteredGardens {fallbackLocation} />
  <FileTrailModal bind:show={showFileTrailModal} />
  <TrainConnectionsModal bind:show={showTrainConnectionsModal} />
</div>

<style>
  .map-section {
    width: 100%;
    height: calc(100% - var(--height-footer) - var(--height-nav));
    position: fixed;
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
      height: calc(100% - var(--height-mobile-nav) - env(safe-area-inset-bottom));
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
</style>

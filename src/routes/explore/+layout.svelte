<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import { getAllListedGardens } from '$lib/api/garden';
  import { allGardens, isFetchingGardens } from '$lib/stores/garden';
  import routes from '$lib/routes';
  import Map from '$lib/components/Map/Map.svelte';
  import Drawer from '$lib/components/Garden/Drawer.svelte';
  import GardenLayer from '$lib/components/Map/GardenLayer.svelte';
  import WaymarkedTrails from '$lib/components/Map/WaymarkedTrails.svelte';
  import Filter from '$lib/components/Garden/Filter.svelte';
  import { Progress, Icon } from '$lib/components/UI';

  import { getCookie, setCookie } from '$lib/util';
  import { crossIcon } from '$lib/images/icons';
  import { ZOOM_LEVELS } from '$lib/constants';
  import LayersAndTools from '@/lib/components/Map/LayersAndTools.svelte';
  import RouteModal from '@/lib/components/Map/RouteModal.svelte';
  import Trail from '@/lib/components/Map/Trail.svelte';
  import type { Garden } from '@/lib/types/Garden';
  import { savedGardens as savedGardenStore } from '@/lib/stores/savedGardens';

  let fallbackLocation = { longitude: 4.5, latitude: 50.5 };
  let geolocationIsLoaded = false;
  let showHiking = false;
  let showCycling = false;
  let showRouteModal = false;
  let showGardens = true;
  let showSavedGardens = false;
  let filteredGardens: { [id: string]: Garden };
  let savedGardens = [] as string[];
  let carNoticeShown = !getCookie('car-notice-dismissed');

  // true when visiting the link to a garden directly, used to increase zoom level
  // TODO check this: It looks like there is no need for a subscribe on page
  let usingGardenLink = !!$page.params.gardenId;

  let zoom = usingGardenLink ? ZOOM_LEVELS.ROAD : ZOOM_LEVELS.SMALL_COUNTRY;

  $: applyZoom = usingGardenLink ? true : false;
  $: selectedGarden = $isFetchingGardens ? null : $allGardens[$page.params.gardenId];
  $: center = selectedGarden
    ? { longitude: selectedGarden.location.longitude, latitude: selectedGarden.location.latitude }
    : fallbackLocation;

  savedGardenStore.subscribe((gardens) => {
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
    const date = new Date();
    // one year
    date.setTime(date.getTime() + 365 * 86400000); //24 * 60 * 60 * 1000
    setCookie('car-notice-dismissed', true, { expires: date.toGMTString() });
    carNoticeShown = false;
  };

  // LIFECYCLE HOOKS

  onMount(async () => {
    if (Object.keys($allGardens).length === 0) {
      try {
        await getAllListedGardens();
      } catch (ex) {
        console.log(ex);
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
    <Trail />
  </Map>
  <LayersAndTools bind:showHiking bind:showCycling bind:showGardens bind:showSavedGardens />
  <Filter on:goToPlace={goToPlace} bind:filteredGardens {fallbackLocation} />
  <RouteModal bind:show={showRouteModal} />
</div>

<style>
  .map-section {
    width: 100%;
    height: calc(calc(var(--vh, 1vh) * 100) - var(--height-footer));
    position: fixed;
    top: 0;
    left: 0;
  }

  .map-section :global(.mapboxgl-ctrl-top-left) {
    top: calc(var(--height-nav) + 0.5rem);
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
    font-weight: 900;
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
      height: calc(calc(var(--vh, 1vh) * 100) - var(--height-nav));
    }
    .map-section :global(.mapboxgl-ctrl-top-left) {
      top: 1rem;
    }

    .map-section :global(.mapboxgl-ctrl-bottom-right) {
      top: 0;
      right: 0;
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

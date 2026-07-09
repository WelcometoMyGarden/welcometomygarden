<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount } from 'svelte';
  import Map, { currentPosition, mapState } from '$lib/components/Map/Map.svelte';
  import CoverageLayer from '$lib/components/Map/CoverageLayer.svelte';
  import FilterLocation from '$lib/components/Garden/FilterLocation.svelte';
  import ShareModal from '$lib/components/Share/ShareModal.svelte';
  import InfoBox from './InfoBox.svelte';
  import {
    LOCATION_BELGIUM,
    LOCATION_WESTERN_EUROPE,
    nonMemberMaxZoom,
    ZOOM_LEVELS
  } from '$lib/constants';
  import type { LongLat } from '$lib/types/Garden';
  import { lnglatToObject } from '$lib/api/mapbox';

  // The location search does not need a "searching" state affordance here, but the
  // FilterLocation component requires a bindable prop.
  let isSearching = $state(false);

  let zoom = $state(ZOOM_LEVELS.WESTERN_EUROPE);
  let applyZoom = $state(false);

  // Controls the map location imperatively (see /explore for the same pattern).
  let centerLocation = $state(LOCATION_WESTERN_EUROPE);

  let showShareModal = $state(false);

  const goToPlace = (event: LongLat) => {
    zoom = ZOOM_LEVELS.CITY;
    applyZoom = true;
    centerLocation = { longitude: event.longitude, latitude: event.latitude };
  };

  onMount(() => {
    // Restore the previous map view if we've been here (or on /explore) before.
    if ($mapState) {
      zoom = $mapState.zoom;
      centerLocation = lnglatToObject($mapState.center.toArray() as [number, number]);
    }
  });
</script>

<svelte:head>
  <title>{$_('map.every15km.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<div class="map-section">
  <Map
    lon={centerLocation.longitude}
    lat={centerLocation.latitude}
    maxZoom={nonMemberMaxZoom}
    recenterOnUpdate
    enableGeolocation={false}
    {zoom}
    {applyZoom}
  >
    <CoverageLayer />
  </Map>

  <div class="location-search">
    <div class="location-filter">
      <FilterLocation
        onGoToPlace={goToPlace}
        bind:isSearching
        closeToLocation={$currentPosition ?? LOCATION_BELGIUM}
      />
    </div>
  </div>

  <InfoBox onShare={() => (showShareModal = true)} />
</div>

<ShareModal bind:show={showShareModal} />

<style>
  .map-section {
    width: 100%;
    height: 100%;
    top: var(--height-nav);
    left: 0;
  }

  /* Mirrors the positioning of the /explore location filter, but without the
     facilities filter button next to it. */
  .location-search {
    --mapbox-zoom-ctrl-full-width: 39px;
    position: absolute;
    top: var(--spacing-map-controls);
    left: calc(var(--mapbox-zoom-ctrl-full-width) + var(--spacing-map-controls));
    width: 32rem;
    z-index: 5;
  }

  .location-filter {
    position: relative;
  }

  @media screen and (max-width: 700px) {
    .map-section {
      top: 0;
    }

    .location-search {
      top: calc(var(--spacing-map-controls) + env(safe-area-inset-top, 0px));
      width: calc(100% - var(--mapbox-zoom-ctrl-full-width) - var(--spacing-map-controls) - 10px);
    }

    /* Lift the map scale/distance legend (bottom-right) above the collapsed
       info box bar so it isn't hidden behind it. */
    .map-section :global(.mapboxgl-ctrl-bottom-right) {
      bottom: calc(var(--spacing-map-controls) + 5.5rem);
    }
  }
</style>

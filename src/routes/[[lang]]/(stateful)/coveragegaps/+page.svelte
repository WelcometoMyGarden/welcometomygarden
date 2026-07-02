<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';
  import { getAllListedGardens } from '$lib/api/garden';
  import { allListedGardens, isFetchingGardens } from '$lib/stores/garden';
  import Map, { currentPosition, mapState } from '$lib/components/Map/Map.svelte';
  import CoverageHeatmapLayer, {
    COVERAGE_RADIUS_KM
  } from '$lib/components/Map/CoverageHeatmapLayer.svelte';
  import FilterLocation from '$lib/components/Garden/FilterLocation.svelte';
  import { Progress } from '$lib/components/UI';
  import {
    LOCATION_BELGIUM,
    LOCATION_WESTERN_EUROPE,
    nonMemberMaxZoom,
    ZOOM_LEVELS
  } from '$lib/constants';
  import type { LongLat } from '$lib/types/Garden';
  import { lnglatToObject } from '$lib/api/mapbox';
  import logger from '$lib/util/logger';

  // The location search does not need a "searching" state affordance here, but the
  // FilterLocation component requires a bindable prop.
  let isSearching = $state(false);

  let zoom = $state(ZOOM_LEVELS.WESTERN_EUROPE);
  let applyZoom = $state(false);

  // Controls the map location imperatively (see /explore for the same pattern).
  let centerLocation = $state(LOCATION_WESTERN_EUROPE);

  const goToPlace = (event: LongLat) => {
    zoom = ZOOM_LEVELS.CITY;
    applyZoom = true;
    centerLocation = { longitude: event.longitude, latitude: event.latitude };
  };

  onMount(async () => {
    // Restore the previous map view if we've been here (or on /explore) before.
    if ($mapState) {
      zoom = $mapState.zoom;
      centerLocation = lnglatToObject($mapState.center.toArray() as [number, number]);
    }

    // Fetch all gardens if they aren't loaded yet.
    if ($allListedGardens.length === 0 && !$isFetchingGardens) {
      await getAllListedGardens().catch((ex) => {
        logger.error(ex);
        isFetchingGardens.set(false);
      });
    }
  });

  onDestroy(() => {
    isFetchingGardens.set(false);
  });
</script>

<svelte:head>
  <title>{$_('map.coverage-gaps.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={$isFetchingGardens} />

<div class="map-section">
  <Map
    lon={centerLocation.longitude}
    lat={centerLocation.latitude}
    maxZoom={nonMemberMaxZoom}
    recenterOnUpdate
    enableFullscreen
    {zoom}
    {applyZoom}
  >
    {#if $allListedGardens.length > 0}
      <CoverageHeatmapLayer gardens={$allListedGardens} />
    {/if}
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

  <div class="legend" aria-hidden="true">
    <p class="legend-title">{$_('map.coverage-gaps.title')}</p>
    <div class="legend-scale">
      <span class="legend-swatch legend-swatch--covered"></span>
      <span class="legend-gradient"></span>
      <span class="legend-swatch legend-swatch--gap"></span>
    </div>
    <div class="legend-labels">
      <span
        >{$_('map.coverage-gaps.legend.covered', { values: { radius: COVERAGE_RADIUS_KM } })}</span
      >
      <span>{$_('map.coverage-gaps.legend.gap')}</span>
    </div>
  </div>
</div>

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

  .legend {
    position: absolute;
    bottom: calc(var(--height-footer, 4.5rem) + var(--spacing-map-controls));
    left: var(--spacing-map-controls);
    z-index: 5;
    background-color: var(--color-white);
    border-radius: var(--modal-border-radius);
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.15);
    padding: 1rem 1.2rem;
    max-width: 24rem;
  }

  .legend-title {
    font-weight: 600;
    font-size: 1.4rem;
    margin-bottom: 0.6rem;
  }

  .legend-scale {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .legend-swatch,
  .legend-gradient {
    height: 1rem;
    border-radius: 2px;
  }

  .legend-swatch {
    width: 1.4rem;
    flex-shrink: 0;
  }

  .legend-swatch--covered {
    background-color: rgb(40, 150, 75);
  }

  .legend-swatch--gap {
    background-color: rgb(214, 40, 40);
  }

  .legend-gradient {
    flex-grow: 1;
    background: linear-gradient(
      to right,
      rgb(40, 150, 75),
      rgb(190, 200, 60),
      rgb(240, 170, 50),
      rgb(214, 40, 40)
    );
  }

  .legend-labels {
    display: flex;
    justify-content: space-between;
    font-size: 1.2rem;
    margin-top: 0.4rem;
    gap: 1rem;
  }

  @media screen and (max-width: 700px) {
    .map-section {
      top: 0;
    }

    .location-search {
      top: calc(var(--spacing-map-controls) + env(safe-area-inset-top, 0px));
      width: calc(100% - var(--mapbox-zoom-ctrl-full-width) - var(--spacing-map-controls) - 10px);
    }

    .legend {
      bottom: calc(var(--spacing-map-controls) + env(safe-area-inset-bottom, 0px));
      max-width: 18rem;
    }
  }
</style>

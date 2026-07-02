<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';
  import { getAllListedGardens } from '$lib/api/garden';
  import { allListedGardens, isFetchingGardens } from '$lib/stores/garden';
  import Map, { currentPosition, mapState } from '$lib/components/Map/Map.svelte';
  import CoverageHeatmapLayer, {
    COVERAGE_RADIUS_KM,
    GRADIENT_END_KM,
    COVERAGE_COLORS
  } from '$lib/components/Map/CoverageHeatmapLayer.svelte';
  import CoverageTweaks from '$lib/components/Map/CoverageTweaks.svelte';
  import { coverageTweaks } from '$lib/stores/coverageTweaks';
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

  // Legend geometry, derived from the coverage constants so it always matches the
  // map overlay. The legend spans 0–GRADIENT_END_KM: solid green until
  // COVERAGE_RADIUS_KM, then a gradient through yellow to red at the far end.
  const greenPct = (COVERAGE_RADIUS_KM / GRADIENT_END_KM) * 100;
  const midPct = ((COVERAGE_RADIUS_KM + GRADIENT_END_KM) / 2 / GRADIENT_END_KM) * 100;
  const legendGradient =
    `linear-gradient(to right,` +
    ` rgb(${COVERAGE_COLORS.covered}) 0%,` +
    ` rgb(${COVERAGE_COLORS.covered}) ${greenPct}%,` +
    ` rgb(${COVERAGE_COLORS.mid}) ${midPct}%,` +
    ` rgb(${COVERAGE_COLORS.gap}) 100%)`;

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
      <CoverageHeatmapLayer gardens={$allListedGardens} mode={$coverageTweaks.mode} />
    {/if}
  </Map>

  <CoverageTweaks />

  <div class="location-search">
    <div class="location-filter">
      <FilterLocation
        onGoToPlace={goToPlace}
        bind:isSearching
        closeToLocation={$currentPosition ?? LOCATION_BELGIUM}
      />
    </div>
  </div>

  <div class="legend">
    <p class="legend-title">{$_('map.coverage-gaps.title')}</p>
    <div class="legend-endpoints">
      <span
        >{$_('map.coverage-gaps.legend.covered', { values: { radius: COVERAGE_RADIUS_KM } })}</span
      >
      <span>{$_('map.coverage-gaps.legend.gap')}</span>
    </div>
    <div class="legend-bar" style="background: {legendGradient};">
      <span class="legend-tick" style="left: {greenPct}%;"></span>
    </div>
    <div class="legend-ticks">
      <span style="left: 0%;">0</span>
      <span style="left: {greenPct}%;">{COVERAGE_RADIUS_KM} km</span>
      <span style="left: 100%;">{GRADIENT_END_KM} km</span>
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

  .legend-endpoints {
    display: flex;
    justify-content: space-between;
    font-size: 1.2rem;
    margin-bottom: 0.3rem;
    gap: 1rem;
  }

  /* The gradient bar maps distance-to-nearest-garden (0 → GRADIENT_END_KM). */
  .legend-bar {
    position: relative;
    height: 1rem;
    border-radius: 2px;
  }

  /* Marker at the COVERAGE_RADIUS_KM boundary (end of the solid-green zone). */
  .legend-tick {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    transform: translateX(-50%);
    background-color: var(--color-black, #000);
  }

  .legend-ticks {
    position: relative;
    height: 1.4rem;
    margin-top: 0.3rem;
    font-size: 1.2rem;
  }

  .legend-ticks span {
    position: absolute;
    transform: translateX(-50%);
    white-space: nowrap;
  }

  /* Keep the first and last labels within the bar's bounds. */
  .legend-ticks span:first-child {
    transform: translateX(0);
  }

  .legend-ticks span:last-child {
    transform: translateX(-100%);
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

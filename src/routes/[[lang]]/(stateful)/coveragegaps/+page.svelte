<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onMount } from 'svelte';
  import Map, { currentPosition, mapState } from '$lib/components/Map/Map.svelte';
  import CoverageLayer, {
    COVERAGE_RADIUS_KM,
    COVERAGE_COLORS,
    DEFAULT_OVERLAY_OPACITY,
    type StackOrder
  } from '$lib/components/Map/CoverageLayer.svelte';
  import FilterLocation from '$lib/components/Garden/FilterLocation.svelte';
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

  // Temporary controls for tuning the overlay's look before we settle on final values.
  // Remove this panel (and the underlying props) once we've picked a stacking order & opacity.
  const STACK_ORDER_OPTIONS: { value: StackOrder; label: string }[] = [
    { value: 'top', label: 'Above everything (incl. labels)' },
    { value: 'above-roads', label: 'Above roads, below place names' },
    {
      value: 'above-roads-below-borders',
      label: 'Above roads, below place names & country borders'
    },
    { value: 'below-roads', label: 'Below roads & labels (as-is)' }
  ];
  let stackOrder = $state<StackOrder>('above-roads');
  let opacity = $state(DEFAULT_OVERLAY_OPACITY);

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
  <title>{$_('map.coverage-gaps.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

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
    <CoverageLayer {stackOrder} {opacity} />
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

  <div class="tweaks">
    <p class="tweaks-title">Tweaks (dev only)</p>

    <fieldset class="tweaks-group">
      <legend>Layer order</legend>
      {#each STACK_ORDER_OPTIONS as option (option.value)}
        <label class="tweaks-radio">
          <input type="radio" bind:group={stackOrder} value={option.value} />
          {option.label}
        </label>
      {/each}
    </fieldset>

    <label class="tweaks-slider">
      <span>Opacity: {Math.round(opacity * 100)}%</span>
      <input type="range" min="0" max="1" step="0.05" bind:value={opacity} />
    </label>
  </div>

  <div class="legend">
    <p class="legend-title">{$_('map.coverage-gaps.title')}</p>
    <div class="legend-items">
      <div class="legend-item">
        <span class="legend-swatch" style="background-color: rgb({COVERAGE_COLORS.covered});"
        ></span>
        <span
          >{$_('map.coverage-gaps.legend.covered', {
            values: { radius: COVERAGE_RADIUS_KM }
          })}</span
        >
      </div>
      <div class="legend-item">
        <span class="legend-swatch" style="background-color: rgb({COVERAGE_COLORS.gap});"></span>
        <span>{$_('map.coverage-gaps.legend.gap')}</span>
      </div>
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

  /* Temporary dev panel for tuning the overlay's stacking & opacity. */
  .tweaks {
    position: absolute;
    top: var(--spacing-map-controls);
    right: var(--spacing-map-controls);
    z-index: 5;
    background-color: var(--color-white);
    border-radius: var(--modal-border-radius);
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.15);
    padding: 1rem 1.2rem;
    max-width: 22rem;
    font-size: 1.2rem;
  }

  .tweaks-title {
    font-weight: 600;
    font-size: 1.4rem;
    margin-bottom: 0.6rem;
  }

  .tweaks-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    border: none;
    padding: 0;
    margin: 0 0 0.8rem;
  }

  .tweaks-group legend {
    font-weight: 600;
    padding: 0;
    margin-bottom: 0.2rem;
  }

  .tweaks-radio {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .tweaks-slider {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .tweaks-slider input[type='range'] {
    width: 100%;
  }

  .legend-title {
    font-weight: 600;
    font-size: 1.4rem;
    margin-bottom: 0.6rem;
  }

  .legend-items {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 1.2rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .legend-swatch {
    flex-shrink: 0;
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 2px;
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

    /* Avoid the full-width location search bar; tuck the dev panel in the
       bottom-right instead, opposite the legend. */
    .tweaks {
      top: auto;
      bottom: calc(var(--spacing-map-controls) + env(safe-area-inset-bottom, 0px));
      right: var(--spacing-map-controls);
      max-width: 15rem;
      font-size: 1.1rem;
    }
  }
</style>

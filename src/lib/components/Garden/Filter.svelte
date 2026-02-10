<script module lang="ts">
  export type CapacityFilterType = {
    min: number;
    max: number;
  };
  /**
   * If a value is not included, it will not be shown as a filter.
   * A false value may still be shown.
   */
  export type FacilitiesFilterType = BooleanGardenFacilities;
</script>

<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Button, Tag } from '$lib/components/UI';
  import FacilitiesFilter from '$lib/components/Garden/FacilitiesFilter.svelte';
  import FilterLocation from '$lib/components/Garden/FilterLocation.svelte';
  import { filterIcon } from '$lib/images/icons';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import type { BooleanGardenFacilities, Garden, LongLat } from '$lib/types/Garden';
  import { facilities } from '$lib/stores/facilities';
  import { MAX_GARDEN_CAPACITY, MOBILE_BREAKPOINT } from '$lib/constants';
  import { innerWidth } from 'svelte/reactivity/window';
  import ViteSVG from '../UI/ViteSVG.svelte';

  interface Props {
    /**
     * Prioritize location filter results close to this location.
     */
    closeToLocation: any;
    onGoToPlace: (ll: LongLat) => void;
  }

  let { closeToLocation, onGoToPlace }: Props = $props();

  /**
   * Generates a default (unfiltered) facility filter configuration.
   * Needs to be a function that generates new objects, because of the bind: semantics
   * applied to `filter.facilities`: changes would mutate the default initializer object, making a reset
   * behave unexpectedly (it wouldn't reset filters).
   */
  const unfilteredFacilities = () =>
    Object.fromEntries($facilities.map((f) => [f.name, false])) as FacilitiesFilterType;

  let showFilterModal = $state(false);

  type FilterType = {
    facilities: FacilitiesFilterType;
    capacity: CapacityFilterType;
  };

  let filter: FilterType = $state({
    facilities: unfilteredFacilities(),
    capacity: {
      min: 1,
      max: MAX_GARDEN_CAPACITY
    }
  });

  let isSearching = $state(false);

  let allFiltersTag = $derived.by(() => {
    let activeFacilitiesFiltered = $facilities.filter(
      (facility) => filter.facilities[facility.name] === true
    );

    if (!innerWidth.current || innerWidth.current < MOBILE_BREAKPOINT) {
      if (activeFacilitiesFiltered.length > 2 && filter.capacity.min > 1) {
        return true;
      } else if (activeFacilitiesFiltered.length > 3) {
        activeFacilitiesFiltered = activeFacilitiesFiltered.slice(0, 3);
        return true;
      }
    }
    return false;
  });

  const activeFacilities = $derived.by(() => {
    let activeFacilitiesFiltered = $facilities.filter(
      (facility) => filter.facilities[facility.name] === true
    );
    if (!innerWidth.current || innerWidth.current < MOBILE_BREAKPOINT) {
      if (activeFacilitiesFiltered.length > 2 && filter.capacity.min > 1) {
        return activeFacilitiesFiltered.slice(0, 2);
      } else if (activeFacilitiesFiltered.length > 3) {
        return activeFacilitiesFiltered.slice(0, 3);
      }
    }
    return activeFacilitiesFiltered;
  });
</script>

<div class="filter">
  <div class="filter-controls">
    <div class="location-filter">
      <FilterLocation {onGoToPlace} bind:isSearching {closeToLocation} />
    </div>
    <div class="garden-filter">
      <Button
        type="button"
        uppercase
        small
        onclick={() => {
          showFilterModal = true;
          trackEvent(PlausibleEvent.SHOW_GARDEN_FILTER);
        }}
      >
        <ViteSVG icon={filterIcon}></ViteSVG>
      </Button>
    </div>
  </div>
  {#if !isSearching}
    <div class="filter-tags">
      {#each activeFacilities as facility (facility.name)}
        <Tag
          name={facility.name}
          icon={facility.icon}
          onclose={() => (filter.facilities[facility.name] = false)}
        >
          {facility.label}
        </Tag>
      {/each}
      {#if filter.capacity.min > 1}
        <Tag name="min-capacity" onclose={() => (filter.capacity.min = 1)}>
          {$_('garden.filter.min-capacity', {
            values: {
              capacity: filter.capacity.min
            }
          })}
        </Tag>
      {/if}
      {#if allFiltersTag}
        <Tag
          name="all-filters"
          pointer={true}
          invert={true}
          onclick={() => {
            showFilterModal = true;
          }}
          onclose={() => {
            // Reset filters
            filter = {
              facilities: unfilteredFacilities(),
              capacity: {
                min: 1,
                max: MAX_GARDEN_CAPACITY
              }
            };
          }}
          closeButton={true}
        >
          {$_('garden.filter.all-filters')}
        </Tag>
      {/if}
    </div>
  {/if}
</div>

<FacilitiesFilter bind:show={showFilterModal} bind:filter />

<style>
  :root {
    /* TODO: might as well override the mapbox zoom controls side & top spacing
        with our own rem-based spacing for full consistency? */
    --mapbox-zoom-ctrl-full-width: 39px;
    --mapbox-zoom-ctrl-padding: 10px;
  }

  .filter {
    background-color: rgba(255, 255, 255, 0);
    top: var(--spacing-map-controls);
    width: 32rem;
    /* Width of zoom control incl padding: 39px */
    left: calc(var(--mapbox-zoom-ctrl-full-width) + var(--spacing-map-controls));
    position: absolute;
    z-index: 5;
  }

  .filter-controls {
    display: flex;
    flex-wrap: nowrap;
  }

  .location-filter {
    width: calc(100% - 60px);
    margin-right: var(--spacing-map-controls);
    position: relative;
  }

  .filter-tags {
    padding: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .filter :global(input) {
    border-radius: var(--modal-border-radius);
    border-bottom: none;
  }

  .filter :global(.input:focus) {
    border-radius: var(--modal-border-radius);
    border-bottom: none;
  }

  /* Override button styles to make it match the search box height */
  .garden-filter {
    margin-bottom: 1rem;
  }
  .garden-filter :global(button.small) {
    /* The container margin-bottom + height combo
       replicates how the location filter is aligned */
    height: 100%;

    /* Use flexbox to center instead */
    padding: 0 0;
    min-width: 5.5rem;
    font-size: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
  }

  .garden-filter :global(button > span) {
    display: flex;
    align-items: center;
  }

  .garden-filter :global(span) {
    line-height: 1.2rem;
  }

  @media screen and (max-width: 700px) {
    .filter {
      /* Align with scale control */
      top: 10px;
      /* Full width (including control padding) on the left
       - control inner spacing until the Filter component
       - spacing on the right, equal to the control padding */
      width: calc(
        100% - var(--mapbox-zoom-ctrl-full-width) - var(--spacing-map-controls) -
          var(--mapbox-zoom-ctrl-padding)
      );
      /* This should not be necessary with the above width, but for safety */
      margin-right: var(--mapbox-zoom-ctrl-padding);
    }
  }

  /* Allow the map to be edge-to-edge under unsafe top elements
     while dodging these lements for the search filter. */
  :global(.app.native.ios .filter) {
    top: calc(env(safe-area-inset-top));
  }
</style>

<script context="module" lang="ts">
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
  import type { BooleanGardenFacilities, Garden } from '$lib/types/Garden';
  import { facilities } from '$lib/stores/facilities';
  import { MAX_GARDEN_CAPACITY } from '$lib/constants';

  export let filteredGardens: Garden[] | undefined;
  /**
   * Prioritize location filter results close to this location.
   */
  export let closeToLocation;

  /**
   * Generates a default (unfiltered) facility filter configuration.
   * Needs to be a function that generates new objects, because of the bind: semantics
   * applied to `filter.facilities`: changes would mutate the default initializer object, making a reset
   * behave unexpectedly (it wouldn't reset filters).
   */
  const unfilteredFacilities = () =>
    Object.fromEntries($facilities.map((f) => [f.name, false])) as FacilitiesFilterType;

  let showFilterModal = false;

  type FilterType = {
    facilities: FacilitiesFilterType;
    capacity: CapacityFilterType;
  };

  let filter: FilterType = {
    facilities: unfilteredFacilities(),
    capacity: {
      min: 1,
      max: MAX_GARDEN_CAPACITY
    }
  };

  let isSearching = false;

  let allFiltersTag = false;

  let vw: number;

  const activeFacilities = (currentWidth: number) => {
    let activeFacilitiesFiltered = $facilities.filter(
      (facility) => filter.facilities[facility.name] === true
    );

    let maxWidth = 700;

    allFiltersTag = false;

    if (currentWidth < maxWidth) {
      if (activeFacilitiesFiltered.length > 2 && filter.capacity.min > 1) {
        activeFacilitiesFiltered = activeFacilitiesFiltered.slice(0, 2);
        allFiltersTag = true;
      } else if (activeFacilitiesFiltered.length > 3) {
        activeFacilitiesFiltered = activeFacilitiesFiltered.slice(0, 3);
        allFiltersTag = true;
      }
    }
    return activeFacilitiesFiltered;
  };
</script>

<svelte:window bind:innerWidth={vw} />

<div class="filter">
  <div class="filter-controls">
    <div class="location-filter">
      <FilterLocation on:goToPlace bind:isSearching {closeToLocation} />
    </div>
    <div class="garden-filter">
      <Button
        type="button"
        uppercase
        small
        on:click={() => {
          showFilterModal = true;
          trackEvent(PlausibleEvent.SHOW_GARDEN_FILTER);
        }}
      >
        {@html filterIcon}
      </Button>
    </div>
  </div>
  {#if !isSearching}
    <div class="filter-tags">
      {#each activeFacilities(vw) as facility (facility.name)}
        <Tag
          name={facility.name}
          icon={facility.icon}
          on:close={() => (filter.facilities[facility.name] = false)}
        >
          {facility.label}
        </Tag>
      {/each}
      {#if filter.capacity.min > 1}
        <Tag name="min-capacity" on:close={() => (filter.capacity.min = 1)}>
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
          on:click={() => {
            showFilterModal = true;
          }}
          on:close={() => {
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

<FacilitiesFilter bind:show={showFilterModal} bind:filteredGardens bind:filter />

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
</style>

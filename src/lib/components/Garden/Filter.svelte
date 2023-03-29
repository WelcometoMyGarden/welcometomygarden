<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Button, Tag } from '$lib/components/UI';
  import FacilitiesFilter from '$lib/components/Garden/FacilitiesFilter.svelte';
  import FilterLocation from '$lib/components/Garden/FilterLocation.svelte';
  import {
    filterIcon,
    bonfireIcon,
    electricityIcon,
    showerIcon,
    toiletIcon,
    waterIcon,
    tentIcon
  } from '$lib/images/icons';
  import trackEvent from '$lib/util/track-event';
  import { PlausibleEvent } from '$lib/types/Plausible';

  export let filteredGardens;
  export let fallbackLocation;

  let showFilterModal = false;

  let filter = {
    facilities: [],
    capacity: {
      min: 1,
      max: 20
    }
  };

  const facilities = [
    { name: 'toilet', icon: toiletIcon, transKey: 'garden.facilities.labels.toilet' },
    { name: 'shower', icon: showerIcon, transKey: 'garden.facilities.labels.shower' },
    {
      name: 'electricity',
      icon: electricityIcon,
      transKey: 'garden.facilities.labels.electricity'
    },
    { name: 'tent', icon: tentIcon, transKey: 'garden.facilities.labels.tent' },
    { name: 'bonfire', icon: bonfireIcon, transKey: 'garden.facilities.labels.bonfire' },

    { name: 'water', icon: waterIcon, transKey: 'garden.facilities.labels.water' },
    {
      name: 'drinkableWater',
      icon: waterIcon,
      transKey: 'garden.facilities.labels.drinkable-water'
    }
  ];

  let isSearching = false;

  let allFiltersTag = false;

  let vw;

  const activeFacilities = (currentWidth) => {
    let activeFacilitiesFiltered = facilities.filter(
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
      <FilterLocation on:goToPlace bind:isSearching {fallbackLocation} />
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
          {$_(facility.transKey)}
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
            filter = {
              facilities: [],
              capacity: {
                min: 1,
                max: 20
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

<FacilitiesFilter bind:show={showFilterModal} bind:filteredGardens {facilities} bind:filter />

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
    margin-bottom: 5px;
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

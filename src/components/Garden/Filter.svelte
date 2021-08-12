<script>
  import { _ } from 'svelte-i18n';
  import { Icon, Button, Tag } from '@/components/UI';
  import FacilitiesFilter from '@/components/Garden/FacilitiesFilter.svelte';
  import FilterLocation from '@/components/Garden/FilterLocation.svelte';
  import {
    filterIcon,
    bonfireIcon,
    electricityIcon,
    showerIcon,
    toiletIcon,
    waterIcon,
    tentIcon
  } from '@/images/icons';

  export let filteredGardens;
  export let center;
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

  $: activeFacilities = () => {
    let activeFacilitiesFiltered = facilities.filter(
      (facility) => filter.facilities[facility.name] === true
    );

    let maxWidth = 500;

    allFiltersTag = false;

    if (vw < maxWidth) {
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
      <FilterLocation bind:center bind:isSearching {fallbackLocation} />
    </div>
    <div class="garden-filter">
      <Button
        type="button"
        uppercase
        on:click={() => {
          showFilterModal = true;
        }}
      >
        {@html filterIcon}
      </Button>
    </div>
  </div>
  {#if !isSearching}
    <div class="filter-tags">
      {#each activeFacilities() as facility (facility.name)}
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
  .filter {
    background-color: rgba(255, 255, 255, 0);
    width: 80%;
    top: calc(var(--height-nav) + 1.5rem);
    width: 32rem;
    left: 6rem;
    position: absolute;
  }

  .filter-controls {
    display: flex;
    flex-wrap: wrap;
    margin-bottom: 5px;
  }

  .location-filter {
    width: calc(100% - 60px);
    margin-right: 0.5rem;
  }

  .filter-tags {
    padding: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .filter :global(input) {
    border-radius: 10px;
    border-bottom: none;
  }

  .filter :global(.input:focus) {
    border-radius: 10px;
    border-bottom: none;
  }

  .garden-filter :global(button) {
    padding: 0 1.2rem;
    font-size: 1.6rem;
    display: flex;
    align-items: center;
    height: 43px;
    margin: 0;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
  }

  .garden-filter :global(span) {
    line-height: 1.2rem;
  }

  @media screen and (max-width: 700px) {
    .filter {
      top: 3rem;
      width: 72%;
      left: 50%;
      transform: translateX(-50%);
    }
  }
</style>

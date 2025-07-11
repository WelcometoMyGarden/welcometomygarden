<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { beforeUpdate } from 'svelte';
  import { LabeledCheckbox, Button, Modal } from '$lib/components/UI';
  import { allListedGardens } from '$lib/stores/garden';
  import type { Garden } from '$lib/types/Garden';
  import { type CapacityFilterType, type FacilitiesFilterType } from './Filter.svelte';
  import { facilities } from '$lib/stores/facilities';
  import { MAX_GARDEN_CAPACITY } from '$lib/constants';

  // Will practically never be `undefined`, because it is initialized in beforeUpdate
  export let filteredGardens: Garden[] | undefined;
  export let filter;
  export let show: boolean;

  // because filter has a 2 way binding, if filter is modified somewhere the fx is called
  beforeUpdate(() => {
    filteredGardens = returnFilteredGardens();
  });

  const capacityMinReduce = () => {
    if (filter.capacity.min > 1) filter.capacity.min -= 1;
  };
  const capacityMinIncrease = () => {
    if (filter.capacity.min < MAX_GARDEN_CAPACITY) filter.capacity.min += 1;
  };

  function gardenFilterFacilities(this: FacilitiesFilterType, garden: Garden) {
    for (const [key, value] of Object.entries(this)) {
      if (value && garden.facilities[key as keyof FacilitiesFilterType] !== value) return false;
    }
    return true;
  }

  function gardenFilterCapacity(this: CapacityFilterType, garden: Garden) {
    const value = garden.facilities.capacity;
    return value >= this.min && value <= this.max;
  }

  const returnFilteredGardens = () => {
    return $allListedGardens
      .filter(gardenFilterFacilities, filter.facilities)
      .filter(gardenFilterCapacity, filter.capacity);
  };

  let stickToBottom = false;
  let maxWidth = 700;

  let vw: number;

  // Stick the modal to the bottom on mobile
  $: {
    if (vw < maxWidth) {
      stickToBottom = true;
    } else {
      stickToBottom = false;
    }
  }
</script>

<svelte:window bind:innerWidth={vw} />

<Modal
  bind:show
  maxWidth="{maxWidth}px"
  center={!stickToBottom}
  {stickToBottom}
  nopadding={stickToBottom}
  ariaLabelledBy="title"
>
  <div slot="title" class="gardenFilterTitleSection" let:ariaLabelledBy id={ariaLabelledBy}>
    <h2 id="gardenFilterTitle">{$_('garden.filter.title')}</h2>
  </div>
  <div slot="body" class="gardenFilterBodySection">
    <hr />
    <div id="gardenFacilities" class="gardenFilterSection">
      <h3 class="gardenFilterSubtitle">{$_('garden.filter.garden-facilities')}</h3>
      <div class="gardenFilterCheckboxes">
        {#each $facilities as facility (facility.name)}
          <div class="gardenFilterCheckbox">
            <LabeledCheckbox
              name={facility.name}
              icon={facility.icon}
              label={facility.label}
              bind:checked={filter.facilities[facility.name]}
              compact
            />
          </div>
        {/each}
      </div>
    </div>
    <hr />
    <div id="gardenCapacity" class="gardenFilterSection">
      <h3 class="gardenFilterSubtitle">{$_('garden.filter.garden-capacity')}</h3>
      <div class="gardenFilterCapacitySection">
        <div class="gardenFilterCapacityText">
          <p>{$_('garden.filter.spots-available')}</p>
        </div>
        <div class="gardenFilterCapacityModifier">
          <p>{$_('garden.filter.min')}</p>
          <button on:click={capacityMinReduce}><span>&minus;</span></button>
          <input
            type="number"
            class="capacity-input"
            name="capacity"
            min="1"
            max={MAX_GARDEN_CAPACITY}
            bind:value={filter.capacity.min}
          />
          <button on:click={capacityMinIncrease}><span>&plus;</span></button>
        </div>
      </div>
    </div>
  </div>
  <div slot="controls" class="applyGardenFilter">
    <p class="controls-gardens-available">
      {@html $_('garden.filter.available', {
        values: {
          amount: filteredGardens?.length,
          styledAmount: `<strong>${filteredGardens?.length}</strong>`
        }
      })}
    </p>
    <Button
      uppercase
      small
      on:click={() => {
        show = false;
      }}>{$_('garden.filter.apply-filter')}</Button
    >
  </div>
</Modal>

<style>
  .gardenFilterTitleSection {
    width: 100%;
  }

  #gardenFilterTitle {
    font-weight: bold;
    font-size: 2rem;
    text-align: center;
  }

  .gardenFilterSection {
    padding: 2.5rem 1.5rem;
  }

  .gardenFilterSubtitle {
    font-weight: 600;
    font-size: 18px;
    margin-bottom: 1rem;
    text-align: left;
  }

  .gardenFilterCheckboxes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: min-content;
    row-gap: 1.2rem;
  }

  .gardenFilterCapacitySection {
    display: flex;
    flex-direction: row;
  }

  .gardenFilterCapacitySection > div {
    flex: 0 50%;
  }

  .gardenFilterCapacityModifier {
    display: flex;
    justify-content: center;
  }

  .gardenFilterCapacityModifier p:first-of-type {
    margin-left: 1rem;
  }

  .gardenFilterCapacityModifier > button {
    margin: 1px 1rem 0 1rem;
    padding: 0;
    border: 1.5px solid var(--color-green);
    border-radius: 50%;
    background-color: var(--color-white);
    cursor: pointer;
    width: 2.1rem;
    height: 2.1rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .gardenFilterCapacityModifier > button span {
    /* padding-top: 1.5px; */
    font-family: 'Courier', monospace;
    font-weight: bold;
  }

  .gardenFilterCapacityModifier > button:hover {
    background-color: var(--color-green);
    color: var(--color-white);
  }

  .applyGardenFilter {
    text-align: center;
  }

  .controls-gardens-available {
    padding-bottom: 1rem;
  }

  .capacity-input {
    font-weight: bold;
    border: none;
    border-bottom: 2px solid var(--color-green);
    width: 5rem;
    text-align: center;
  }

  @media screen and (max-width: 500px) {
    .gardenFilterCapacityText {
      display: none;
    }

    .gardenFilterCapacitySection {
      flex-wrap: wrap;
      margin: auto;
      text-align: center;
    }

    .gardenFilterCapacitySection > div {
      flex: 0 100%;
    }

    .gardenFilterCheckbox :global(input) {
      margin-right: 0rem;
    }
  }

  @media screen and (max-width: 700px) {
    #gardenFilterTitle {
      font-size: initial;
      font-weight: 600;
    }

    .gardenFilterSection {
      padding: 1.5rem 0.75rem;
    }

    .gardenFilterSubtitle {
      font-weight: 600;
      font-size: initial;
    }

    .gardenFilterCheckboxes {
      row-gap: 0.6rem;
      column-gap: 1.4rem;
    }
  }
</style>

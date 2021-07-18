<script>
  import { beforeUpdate } from 'svelte';
  import { LabeledCheckbox, Button, Modal } from '@/components/UI';

  // because filter has a 2 way binding, if filter is modified somewhere the fx is called
  beforeUpdate(() => {
    filteredGardens = returnFilteredGardens();
  });

  export let facilities;
  export let allGardens;
  export let filteredGardens;
  export let filter;
  export let show;

  const capacityMinReduce = () => {
    if (filter.capacity.min > 1) filter.capacity.min -= 1;
  };
  const capacityMinIncrease = () => {
    if (filter.capacity.min < 20) filter.capacity.min += 1;
  };

  function gardenFilterFacilities(garden) {
    for (const [key, value] of Object.entries(this)) {
      if (value && garden.facilities[key] !== value) return false;
    }
    return true;
  }

  function gardenFilterCapacity(garden) {
    const value = garden.facilities.capacity;
    return value >= this.min && value <= this.max;
  }

  const returnFilteredGardens = () => {
    const gardensFiltered = Object.values(allGardens)
      .filter(gardenFilterFacilities, filter.facilities)
      .filter(gardenFilterCapacity, filter.capacity);
    let gardens = {};
    gardensFiltered.forEach((garden) => {
      gardens[garden.id] = { ...garden };
    });
    return gardens;
  };

  // const filterGardens = (filter, allGardens) => {
  const filterGardens = () => {
    filteredGardens = returnFilteredGardens();
    show = false;
  };

  let stickToBottom = false;
  let maxWidth = 576;

  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

  if (maxWidth && vw < maxWidth) {
    stickToBottom = true;
  } else {
    stickToBottom = false;
  }
</script>

<Modal
  bind:show
  maxWidth="{maxWidth}px"
  radius={true}
  center={!stickToBottom}
  {stickToBottom}
  nopadding={stickToBottom}
  ariaLabelledBy="title"
  let:ariaLabelledBy
>
  <div slot="title" class="gardenFilterTitleSection" id={ariaLabelledBy}>
    <h2 id="gardenFilterTitle">Filter</h2>
  </div>
  <div slot="body" class="gardenFilterBodySection">
    <hr />
    <div id="gardenFacilities" class="gardenFilterSection">
      <h3 class="gardenFilterSubtitle">Garden Facilities</h3>
      <div class="gardenFilterCheckboxes">
        {#each facilities as facility (facility.name)}
          <div class="gardenFilterCheckbox">
            <LabeledCheckbox {...facility} bind:checked={filter.facilities[facility.name]} />
          </div>
        {/each}
      </div>
    </div>
    <hr />
    <div id="gardenCapacity" class="gardenFilterSection">
      <h3 class="gardenFilterSubtitle">Garden Capacity</h3>
      <div class="gardenFilterCapacitySection">
        <div class="gardenFilterCapacityText">
          <p>Tent spots available</p>
        </div>
        <div class="gardenFilterCapacityModifier">
          <p>Min.</p>
          <button on:click={capacityMinReduce}>-</button>
          <input
            type="number"
            class="capacity-input"
            name="capacity"
            bind:value={filter.capacity.min}
          />
          <button on:click={capacityMinIncrease}>+</button>
        </div>
      </div>
    </div>
  </div>
  <span slot="controls" class="applyGardenFilter">
    <p class="light">{Object.values(filteredGardens).length} gardens</p>
    <Button on:click={() => filterGardens()} medium uppercase>Apply filter</Button>
  </span>
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
    grid-row-gap: 1rem;
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
    margin: 2px 1rem 0 1rem;
    padding: 0;

    border: 1.5px solid var(--color-green);
    border-radius: 50%;

    background-color: var(--color-white);
    cursor: pointer;
    height: 2rem;
    width: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .gardenFilterCapacityModifier > button:hover {
    background-color: var(--color-green);
    color: var(--color-white);
  }

  .applyGardenFilter {
    margin: auto;
    text-align: center;
  }

  .capacity-input {
    font-weight: bold;
    border: none;
    border-bottom: 2px solid var(--color-green);
    width: 5rem;
    text-align: center;
  }

  @media screen and (max-width: 400px) {
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
    }

    .gardenFilterSection {
      padding: 1.5rem 0.75rem;
    }

    .gardenFilterSubtitle {
      font-weight: 600;
      font-size: initial;
      margin-bottom: 0.5rem;
    }

    .gardenFilterCheckboxes {
      grid-row-gap: 0.5rem;
    }
  }
</style>

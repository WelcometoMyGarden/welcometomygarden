<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto, params } from '@sveltech/routify';
  import { getAllListedGardens } from '@/api/garden';
  import { allGardens, isFetchingGardens } from '@/stores/garden';
  import Map from '@/components/Map/Map.svelte';
  import Drawer from '@/components/Garden/Drawer.svelte';
  import GardenLayer from '@/components/Map/GardenLayer.svelte';
  import WaymarkedTrails from '@/components/Map/WaymarkedTrails.svelte';
  import routes from '@/routes';
  import { Progress, LabeledCheckbox } from '@/components/UI';

  $: selectedGarden = $isFetchingGardens ? null : $allGardens[$params.gardenId];
  $: center = selectedGarden
    ? [selectedGarden.location.longitude, selectedGarden.location.latitude]
    : [4.5, 50.5];

  const selectGarden = garden => {
    const newSelectedId = garden.id;
    const newGarden = $allGardens[newSelectedId];
    center = [newGarden.location.longitude, newGarden.location.latitude];
    $goto(`${routes.MAP}/garden/${newSelectedId}`);
  };

  const closeDrawer = () => {
    $goto(routes.MAP);
  };

  onMount(async () => {
    if (Object.keys($allGardens).length === 0) {
      try {
        await getAllListedGardens();
      } catch (ex) {
        console.log(ex);
        isFetchingGardens.set(false);
      }
    }
  });

  onDestroy(() => {
    isFetchingGardens.set(false);
  });

  let showHiking = false;
  let showCycling = false;
</script>

<Progress active={$isFetchingGardens} />
<div class="container">
  <Map lat={center[1]} lon={center[0]} recenterOnUpdate zoom="7">
    {#if !$isFetchingGardens}
      <GardenLayer
        on:garden-click={e => selectGarden(e.detail)}
        selectedGardenId={selectedGarden ? selectedGarden.id : null}
        allGardens={$allGardens} />
      <Drawer on:close={closeDrawer} garden={selectedGarden} />
      <WaymarkedTrails {showHiking} {showCycling} />
      <slot />
    {/if}
  </Map>
  <div class="filters">
    <div>
      <LabeledCheckbox name="cycling" label="Cycling routes" bind:checked={showCycling} />
    </div>
    <div>
      <LabeledCheckbox name="hiking" label="Hiking routes" bind:checked={showHiking} />
    </div>
  </div>
</div>

<style>
  .container {
    width: 100%;
    height: calc(calc(var(--vh, 1vh) * 100) - var(--height-footer));
    position: fixed;
    top: 0;
    left: 0;
  }

  .container :global(.mapboxgl-ctrl-top-left) {
    top: calc(var(--height-nav) + 0.5rem);
  }

  .filters {
    background-color: rgba(255, 255, 255, 0.8);
    bottom: 0;
    left: 0;
    position: absolute;
    width: 20rem;
    height: 5rem;
  }

  @media screen and (max-width: 700px) {
    .container {
      height: calc(calc(var(--vh, 1vh) * 100) - var(--height-nav));
    }
    .container :global(.mapboxgl-ctrl-top-left) {
      top: 0;
    }
    .container :global(.mapboxgl-ctrl-bottom-right) {
      top: 0;
      right: 0;
    }
  }
</style>

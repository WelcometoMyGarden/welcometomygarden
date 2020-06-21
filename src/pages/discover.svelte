<script>
  import { onMount } from 'svelte';
  import { getAllListedGardens } from '@/api/garden';
  import { allGardens, isFetchingGardens } from '@/stores/garden';
  import Map from '@/components/Map/Map.svelte';
  import GardenLayer from '@/components/Map/GardenLayer.svelte';
  import Drawer from '@/components/Map/Drawer.svelte';
  import { Progress } from '@/components/UI';

  let selectedGarden = null;

  const closeDrawer = () => {
    selectedGarden = null;
  };

  const selectGarden = e => {
    const newSelected = { ...e.detail.properties };
    // if garden is already open
    console.log(
      selectedGarden,
      newSelected,
      selectedGarden && selectedGarden.id === newSelected.id
    );
    if (selectedGarden && selectedGarden.id === newSelected.id) closeDrawer();
    else selectedGarden = newSelected;
  };

  onMount(async () => {
    if (!$allGardens) {
      try {
        await getAllListedGardens();
      } catch (ex) {
        console.log(ex);
        isFetchingGardens.set(false);
      }
    }
  });
</script>

<Progress active={$isFetchingGardens} />

<div>
  <Map lat="50.5" lon="4.5" zoom="7">
    {#if !$isFetchingGardens}
      <GardenLayer
        on:garden-click={selectGarden}
        selectedGardenId={selectedGarden ? selectedGarden.id : null}
        gardens={$allGardens} />
    {/if}
    <Drawer on:close={closeDrawer} garden={selectedGarden} />
  </Map>
</div>

<style>
  div {
    width: 100%;
    height: calc(100vh - var(--height-footer));
    position: fixed;
    top: 0;
    left: 0;
  }

  div :global(.mapboxgl-ctrl-top-left) {
    top: calc(var(--height-nav) + 0.5rem);
  }

  @media screen and (max-width: 700px) {
    div {
      height: calc(100vh - var(--height-nav));
    }
    div :global(.mapboxgl-ctrl-top-left) {
      top: 0;
    }
    div :global(.mapboxgl-ctrl-bottom-right) {
      top: 0;
      right: 0;
      height: 2rem;
      margin: 0;
    }
  }
</style>

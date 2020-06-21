<script>
  import { onMount } from 'svelte';
  import { goto, params } from '@sveltech/routify';
  import { getAllListedGardens } from '@/api/garden';
  import { allGardens, isFetchingGardens } from '@/stores/garden';
  import Map from '@/components/Map/Map.svelte';
  import Drawer from '@/components/Garden/Drawer.svelte';
  import GardenLayer from '@/components/Map/GardenLayer.svelte';
  import routes from '@/routes';
  import { Progress } from '@/components/UI';

  $: selectedGarden = $isFetchingGardens ? null : $allGardens[$params.gardenId];

  const selectGarden = garden => {
    const newSelectedId = garden.id;
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
</script>

<svelte:head>
  <title>Explore | Welcome To My Garden</title>
</svelte:head>
<Progress active={$isFetchingGardens} />
<div>
  <Map lat="50.5" lon="4.5" zoom="7">
    {#if !$isFetchingGardens}
      <GardenLayer
        on:garden-click={e => selectGarden(e.detail.properties)}
        selectedGardenId={selectedGarden ? selectedGarden.id : null}
        gardens={$allGardens} />
      <Drawer on:close={closeDrawer} garden={selectedGarden} />
    {/if}
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

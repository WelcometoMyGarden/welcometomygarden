<script>
  import { onMount } from 'svelte';
  import { getAllListedGardens } from '@/api/garden';
  import { allGardens, isFetchingGardens } from '@/stores/garden';
  import Map from '@/components/Map/Map.svelte';
  import GardenLayer from '@/components/Map/GardenLayer.svelte';
  import Drawer from '@/components/Map/Drawer.svelte';
  import { Progress } from '@/components/UI';

  let campsite = null;

  const clickGarden = e => {
    console.log(e.detail);
    if (campsite) {
      campsite = null;
    } else {
      campsite = {
        facilities: {
          bonfire: false,
          capacity: 4,
          drinkableWater: true,
          electricity: false,
          shower: false,
          tent: false,
          toilet: true,
          water: true
        },
        photos: [
          'https://picsum.photos/200/200?1',
          'https://picsum.photos/200/200?2',
          'https://picsum.photos/200/200?3',
          'https://picsum.photos/200/200?4'
        ],
        location: {
          latitude: 0,
          longitude: 0
        },
        description:
          'Quiet location, large garden, child friendly, meadow with animals, no sanitary facilities, toilet by arrangement with the owner.'
      };
    }
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

  const closeDrawer = () => {
    campsite = null;
  };
</script>

<Progress active={$isFetchingGardens} />

<div>
  <Map lat="50.5" lon="4.5" zoom="7">
    {#if !$isFetchingGardens}
      <GardenLayer on:garden-click={clickGarden} gardens={$allGardens} />
    {/if}
    <Drawer on:close={closeDrawer} {campsite} />
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

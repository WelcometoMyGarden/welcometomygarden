<script>
  import Map from '@/components/Map/Map.svelte';
  import GardenLayer from '@/components/Map/GardenLayer.svelte';
  import Drawer from '@/components/Map/Drawer.svelte';

  let campsite = null;

  function simulateCampsiteClick() {
    if (campsite) {
      campsite = null;
    } else {
      campsite = {
        facilities: {
          amountOfTents: 1,
          drinkableWater: true,
          electricity: true,
          tent: false,
          toilet: false,
          shower: false
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
  }
</script>

<div>
  <Map lat="50.5" lon="4.5" zoom="7">
    <GardenLayer />
    <div class="fixed-btn">
      <button on:click={simulateCampsiteClick}>SIMULATE CLICK ON CAMPSITE</button>
    </div>
    <Drawer {campsite} />
  </Map>
</div>

<style>
  /* TODO: Remove that when use real data  */
  .fixed-btn {
    position: absolute;
    top: 100px;
    left: 20px;
    z-index: 1;
    width: 20rem;
    height: auto;
  }

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
  }
</style>

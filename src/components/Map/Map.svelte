<script>
  import { setContext, onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import config from '../../wtmg.config';
  import key from './mapbox-context.js';
  import { Progress } from '../UI';

  import GardenLayer from './GardenLayer.svelte';
  import Drawer from './Drawer.svelte';
  import Button from '../UI/Button.svelte';

  export let lat;
  export let lon;
  export let zoom;
  export let recenterOnUpdate = false;

  let container;
  let map;
  let mapIsLoading = false;
  let campsite = null;

  setContext(key, {
    getMap: () => map
  });

  mapboxgl.accessToken = config.MAPBOX_ACCESS_TOKEN;
  onMount(() => {
    map = new mapboxgl.Map({
      container,
      style: `https://api.maptiler.com/maps/basic/style.json?key=${config.MAPTILER_ACCESS_TOKEN}`,
      center: [lon, lat],
      zoom
    });
    map.on('load', () => {
      mapIsLoading = false;
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');
  });

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

  $: if (recenterOnUpdate && map) {
    map.flyTo({
      center: [lon, lat],
      bearing: 0,

      speed: 0.9,
      curve: 1,

      essential: true
    });
  }
</script>

<svelte:head>
  <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v1.10.1/mapbox-gl.css" />
</svelte:head>

<Progress active={mapIsLoading} />

<div bind:this={container}>
  <!-- TODO: Remove that when use real data -->
  <div class="fixed-btn">
    <button on:click={simulateCampsiteClick}>SIMULATE CLICK ON CAMPSITE</button>
  </div>
  {#if map}
    <GardenLayer />
    <Drawer {campsite} />
    <slot />
  {/if}
</div>

<style>
  div {
    width: 100%;
    height: 100%;
  }

  /* TODO: Remove that when use real data  */
  .fixed-btn {
    position: absolute;
    top: 100px;
    left: 20px;
    z-index: 1;
  }

  @media screen and (max-width: 700px) {
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

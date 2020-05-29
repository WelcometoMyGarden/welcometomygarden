<script>
  import { onMount, setContext } from 'svelte';
  import config from '../../wtmg.config';
  import key from './mapbox-context.js';

  // import Geocoder from './Geocoder.svelte';
  import BivouacLayer from './BivouacLayer.svelte';
  import GardenLayer from './GardenLayer.svelte';

  export let lat;
  export let lon;
  export let zoom;
  let container;
  let map;

  setContext(key, {
    getMap: () => map
  });

  onMount(async () => {
    const mapboxModule = await import('mapbox-gl');
    const mapboxgl = mapboxModule.default;
    mapboxgl.accessToken = config.MAPBOX_ACCESS_TOKEN;

    map = new mapboxgl.Map({
      container,
      style: `https://api.maptiler.com/maps/basic/style.json?key=${config.MAPTILER_ACCESS_TOKEN}`,
      center: [lon, lat],
      zoom
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');
    map.addControl(new mapboxgl.ScaleControl());

    return map.remove;
  });
</script>

<svelte:head>
  <link rel="stylesheet" href="https://api.mapbox.com/mapbox-gl-js/v1.10.1/mapbox-gl.css" />
</svelte:head>

<div bind:this={container}>
  <!-- <Geocoder /> -->
  {#if map}
    <BivouacLayer />
    <GardenLayer />
  {/if}
</div>

<style>
  div {
    width: 100vw;
    height: 100vh;
  }

  div :global(.mapboxgl-ctrl-top-left) {
    top: calc(var(--height-nav) + 0.5rem);
  }

  @media (max-width: 980px) {
    div :global(.mapboxgl-ctrl-top-left) {
      top: calc(var(--height-nav-mobile) + 0.5rem);
    }
  }
</style>

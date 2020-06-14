<script>
  import { setContext, onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import config from '../../wtmg.config';
  import key from './mapbox-context.js';
  import { Progress } from '../UI';

  export let lat;
  export let lon;
  export let zoom;
  export let recenterOnUpdate = false;

  const initialLngLat = [lon, lat];

  let container;
  let map;
  let mapIsLoading = false;

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

  $: if (recenterOnUpdate && map) {
    map.flyTo({
      center: [lon, lat],
      zoom,
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
  <!-- <Geocoder /> -->
  {#if map}
    <slot />
  {/if}
</div>

<style>
  div {
    width: 100%;
    height: 100%;
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

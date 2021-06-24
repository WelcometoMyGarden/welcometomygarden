<script>
  import { setContext, onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import { config } from '@/config';
  import key from './mapbox-context.js';

  export let lat;
  export let lon;
  export let zoom;
  export let recenterOnUpdate = false;

  let container;
  let map;

  let initialLat = lat;
  let initialLon = lon;

  setContext(key, {
    getMap: () => map
  });

  mapboxgl.accessToken = config.MAPBOX_ACCESS_TOKEN;
  const mapStyle = 'mapbox://styles/mapbox/outdoors-v11';

  onMount(() => {
    map = new mapboxgl.Map({
      container,
      style: mapStyle,
      center: [lon, lat],
      zoom,
      attributionControl: false
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');
    map.addControl(new mapboxgl.AttributionControl({ compact: false }));
  });

  $: if (recenterOnUpdate && map && initialLat !== lat && initialLon !== lon) {
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

<div bind:this={container}>
  {#if map}
    <slot />
  {/if}
</div>

<style>
  div {
    width: 100%;
    height: 100%;
  }
</style>

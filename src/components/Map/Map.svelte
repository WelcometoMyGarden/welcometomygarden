<script>
  import { setContext, onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import key from './mapbox-context.js';

  import 'maplibre-gl/dist/maplibre-gl.css';

  export let lat;
  export let lon;
  export let zoom;
  export let recenterOnUpdate = false;
  export let jump = false;

  let container;
  let map;

  let initialLat = lat;
  let initialLon = lon;

  setContext(key, {
    getMap: () => map
  });

  maplibregl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  onMount(() => {
    map = new maplibregl.Map({
      container,
      style: 'mapbox://styles/mapbox/streets-v8',
      center: [lon, lat],
      zoom,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    map.addControl(new maplibregl.AttributionControl({ compact: false }));
  });

  $: if (recenterOnUpdate && map && initialLat !== lat && initialLon !== lon) {
    if (!jump) {
      map.flyTo({
        center: [lon, lat],
        bearing: 0,

        speed: 0.9,
        curve: 1,

        essential: true
      });
    } else {
      map.jumpTo({
        center: [lon, lat],
        zoom
      });
    }
  }
</script>

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

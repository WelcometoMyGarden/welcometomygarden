<script>
  import { setContext, onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import key from './mapbox-context.js';

  import 'maplibre-gl/dist/maplibre-gl.css';

  export let initialLat;
  export let initialLon;
  export let initialZoom;

  let container;
  let map;
  let loaded = false;

  const addZoom = (params, zoom) => {
    if (zoom) params.zoom = zoom;
    return params;
  };

  export const jumpTo = (lon, lat, zoom) => {
    if (!lon || !lat) return;
    map.jumpTo(addZoom({ center: [lon, lat] }, zoom));
  };

  export const flyTo = (lon, lat, zoom) => {
    if (!lon || !lat) return;
    map.flyTo(
      addZoom({ center: [lon, lat], bearing: 0, speed: 1, curve: 1, essential: true }, zoom)
    );
  };

  setContext(key, {
    getMap: () => map
  });

  maplibregl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  onMount(() => {
    map = new maplibregl.Map({
      container,
      style: 'mapbox://styles/mapbox/streets-v8',
      center: [initialLon, initialLat],
      zoom: initialZoom,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    map.addControl(new maplibregl.ScaleControl());
    map.addControl(new maplibregl.AttributionControl({ compact: false }));

    map.on('load', () => {
      loaded = true;
    });
  });
</script>

<div bind:this={container}>
  {#if map && loaded}
    <slot />
  {/if}
</div>

<style>
  div {
    width: 100%;
    height: 100%;
  }
</style>

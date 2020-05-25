<script>
  import { onMount, setContext } from 'svelte';

  import { mapboxgl, key } from './mapbox.js';

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

  onMount(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v1.10.1/mapbox-gl.css';

    link.onload = () => {
      map = new mapboxgl.Map({
        container,
        style: `https://api.maptiler.com/maps/basic/style.json?key=${MAPTILER_KEY}`,
        center: [lon, lat],
        zoom
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');
      map.addControl(new mapboxgl.ScaleControl());
    };

    document.head.appendChild(link);

    return () => {
      map.remove();
      link.parentNode.removeChild(link);
    };
  });
</script>

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

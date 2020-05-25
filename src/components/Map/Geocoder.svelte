<script>
  import { onMount, setContext, getContext } from 'svelte';

  import { mapboxgl, MapboxGeocoder, key } from '../mapbox.js';

  const { getMap } = getContext(key);
  const map = getMap();

  let geocoder;

  setContext(key, {
    getGeocoder: () => geocoder
  });

  onMount(() => {
    geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl
    });

    map.addControl(geocoder);

    return () => map.removeControl(geocoder);
  });
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.5.1/mapbox-gl-geocoder.css" />
</svelte:head>

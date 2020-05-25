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
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.5.1/mapbox-gl-geocoder.css';

    link.onload = () => {
      geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl
      });

      map.addControl(geocoder);
    };

    document.head.appendChild(link);

    return () => {
      map.removeControl(geocoder);

      link.parentNode.removeChild(link);
    };
  });
</script>
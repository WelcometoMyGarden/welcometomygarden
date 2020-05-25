<script>
  import { getContext } from 'svelte';

  import { key } from './mapbox.js';

  const { getMap } = getContext(key);
  const map = getMap();

  map.on('load', () => {
    map.addSource('bivouac', {
      type: 'geojson',
      data: 'data/bivouac.geojson'
      // cluster: true,
      // clusterMaxZoom: 14,
      // clusterRadius: 50
    });

    map.addLayer({
      id: 'bivouac',
      source: 'bivouac',
      type: 'circle',
      paint: {
        'circle-color': 'green'
      }
    });
  });
</script>

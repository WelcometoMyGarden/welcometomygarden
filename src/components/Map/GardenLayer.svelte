<script>
  import { getContext } from 'svelte';

  import { key } from './mapbox.js';

  const { getMap } = getContext(key);
  const map = getMap();

  map.on('load', () => {
    map.addSource('garden', {
      type: 'geojson',
      data: 'data/garden.geojson'
      // cluster: true,
      // clusterMaxZoom: 14,
      // clusterRadius: 50
    });

    map.addLayer({
      id: 'garden',
      source: 'garden',
      type: 'circle',
      paint: {
        'circle-color': 'blue'
      }
    });
  });
</script>

<script>
  export let gardens;

  import { getContext, createEventDispatcher } from 'svelte';

  import key from './mapbox-context.js';

  const { getMap } = getContext(key);
  const map = getMap();

  const dispatch = createEventDispatcher();

  let features = [];
  $: features = Object.keys(gardens).map(uid => {
    const garden = gardens[uid];
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [garden.location.longitude, garden.location.latitude]
      },
      properties: {
        id: uid,
        ...garden
      }
    };
  });

  map.on('load', () => {
    map.addSource('gardens', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features
      }
    });

    map.addLayer({
      id: 'gardens',
      type: 'circle',
      source: 'gardens',
      paint: {
        'circle-color': '#11b4da',
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });

    map.on('click', 'gardens', e => {
      dispatch('garden-click', e.features[0].properties);
    });

    map.on('mouseenter', 'clusters', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'clusters', () => {
      map.getCanvas().style.cursor = 'default';
    });
  });
</script>

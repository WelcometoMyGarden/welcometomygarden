<script>
  export let lat;
  export let lon;

  import { getContext, createEventDispatcher } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import key from './mapbox-context.js';

  const dispatch = createEventDispatcher();

  const { getMap } = getContext(key);
  const map = getMap();

  map.on('load', () => {
    const marker = new mapboxgl.Marker({
      draggable: true
    })
      .setLngLat([lon, lat])
      .addTo(map);

    const onDragEnd = () => {
      const lngLat = marker.getLngLat();

      dispatch('dragged', {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      });
    };

    marker.on('dragend', onDragEnd);
  });
</script>

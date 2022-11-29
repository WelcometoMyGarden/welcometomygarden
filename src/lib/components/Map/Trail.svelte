<script lang="ts">
  import { onDestroy, onMount, getContext } from 'svelte';
  import bbox from '@turf/bbox';
  import type { GeoJSONSource } from 'maplibre-gl';
  import type mapboxgl from 'maplibre-gl';
  import key from './mapbox-context.js';

  export let trail: GeoJSON.Feature<GeoJSON.Geometry> | GeoJSON.FeatureCollection<GeoJSON.Geometry>;

  // @ts-ignore
  const { getMap } = getContext(key);
  const map: mapboxgl.Map = getMap();

  $: if (map.getSource('trail')) (map.getSource('trail') as GeoJSONSource).setData(trail);

  onMount(() => {
    const bboxBounds = <[number, number, number, number]>bbox(trail);
    map.fitBounds(bboxBounds, { padding: 25, maxZoom: 14, linear: true });
    map.addSource('trail', {
      type: 'geojson',
      data: trail
    });
    map.addLayer({
      id: 'trail-line',
      source: 'trail',
      type: 'line',
      paint: {
        'line-width': 7,
        'line-color': 'indigo',
        'line-opacity': 0.7
      }
    });
    // map.addLayer({
    //   id: 'trail-points',
    //   source: 'trail',
    //   type: 'circle',
    //   paint: {
    //     'circle-color': 'indigo',
    //     'circle-radius': 7,
    //     'circle-opacity': 0.9,
    //     'circle-stroke-color': '#333',
    //     'circle-stroke-width': 0.5
    //   }
    // });
  });
</script>

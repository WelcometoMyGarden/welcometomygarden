<script lang="ts">
  import type mapboxgl from 'maplibre-gl';
  import { getContext, onMount, onDestroy } from 'svelte';
  import key from './mapbox-context.js';

  // @ts-ignore
  const { getMap } = getContext(key);
  const map: mapboxgl.Map = getMap();

  export let show = true;

  let railwayLayers = [
    {
      id: 'road-rail',
      type: 'line',
      source: 'composite',
      'source-layer': 'road',
      minzoom: 0,
      filter: [
        'all',
        ['match', ['get', 'class'], ['major_rail', 'minor_rail'], true, false],
        ['match', ['get', 'structure'], ['none', 'ford'], true, false]
      ],
      layout: {},
      paint: {
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 0, 4, 15, 8]
      }
    },
    // {
    //   id: 'road-rail-tracks',
    //   type: 'line',
    //   source: 'composite',
    //   'source-layer': 'road',
    //   minzoom: 0,
    //   filter: [
    //     'all',
    //     ['match', ['get', 'class'], ['major_rail', 'minor_rail'], true, false],
    //     ['match', ['get', 'structure'], ['none', 'ford'], true, false]
    //   ],
    //   layout: {
    //     'line-miter-limit': 20,
    //     'line-join': ['step', ['zoom'], 'miter', 22, 'miter']
    //   },
    //   paint: {
    //     'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 0, 8, 15, 16],
    //     'line-dasharray': [1, 15]
    //   }
    // },
    {
      id: 'bridge-rail',
      type: 'line',
      source: 'composite',
      'source-layer': 'road',
      minzoom: 0,
      filter: [
        'all',
        ['==', ['get', 'structure'], 'bridge'],
        ['match', ['get', 'class'], ['major_rail', 'minor_rail'], true, false]
      ],
      layout: {},
      paint: {
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 0, 4, 15, 8]
      }
    }
    // {
    //   id: 'bridge-rail-tracks',
    //   type: 'line',
    //   source: 'composite',
    //   'source-layer': 'road',
    //   minzoom: 0,
    //   filter: [
    //     'all',
    //     ['==', ['get', 'structure'], 'bridge'],
    //     ['match', ['get', 'class'], ['major_rail', 'minor_rail'], true, false]
    //   ],
    //   layout: {},
    //   paint: {
    //     'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 0, 8, 15, 16],
    //     'line-dasharray': [0.1, 15]
    //   }
    // }
  ];
  for (let i = 0; i < railwayLayers.length; i++) {
    const layer = railwayLayers[i];
    layer.id = `train-and-rails-${layer.id}`;
  }

  const updateVisibility = (id: string, visible?: boolean) => {
    const layer = map.getLayer(id);
    if (layer) {
      if (visible) map.setLayoutProperty(id, 'visibility', 'visible');
      else map.setLayoutProperty(id, 'visibility', 'none');
    }
  };

  $: {
    railwayLayers.map((layer) => {
      if (map.getLayer(layer.id)) updateVisibility(layer.id, show);
    });
  }

  onMount(() => {
    railwayLayers.map((layer) => map.addLayer(layer));
  });

  onDestroy(() => {
    railwayLayers.map((layer) => map.removeLayer(layer.id));
  });
</script>

<script lang="ts">
  import type mapboxgl from 'maplibre-gl';
  import { getContext, onMount, onDestroy } from 'svelte';
  import key from './mapbox-context.js';
  import { fetchFrom } from '@/lib/util';

  // @ts-ignore
  const { getMap } = getContext(key);
  const map: mapboxgl.Map = getMap();

  export let show = true;
  let mapReady = false;
  let stationSourceAndLayerId = 'stations';

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
    layer.layout.visibility = show ? 'visible' : 'none';
  }

  const updateVisibility = (id: string, visible?: boolean) => {
    const layer = map.getLayer(id);
    if (layer) {
      if (visible) map.setLayoutProperty(id, 'visibility', 'visible');
      else map.setLayoutProperty(id, 'visibility', 'none');
    }
  };

  const createStations = async () => {
    const stations = await fetchFrom('/stations.geojson');

    map.addSource(stationSourceAndLayerId, {
      type: 'geojson',
      data: stations
    });

    map.addLayer({
      id: stationSourceAndLayerId,
      type: 'symbol',
      source: stationSourceAndLayerId,
      layout: {
        'icon-image': 'train-all',
        'icon-size': 0.4
      }
    });
  };

  $: if (mapReady) {
    railwayLayers.map((layer) => {
      if (map.getLayer(layer.id)) updateVisibility(layer.id, show);
    });
    updateVisibility(stationSourceAndLayerId, show);
  }

  onMount(async () => {
    try {
      const images = [{ url: '/images/markers/train-dark-blue.png', id: 'train-all' }];

      await Promise.all(
        images.map((img) =>
          new Promise((resolve) => {
            map.loadImage(img.url, (err, res) => {
              if (!map.hasImage(img.id)) map.addImage(img.id, res);
              resolve(true);
            });
          }).catch((err) => {
            // should not error in prod
            console.log(err);
          })
        )
      );
    } catch (err) {
      console.log(err);
    }

    railwayLayers.map((layer) => map.addLayer(layer));

    await createStations();
    mapReady = true;
  });
</script>

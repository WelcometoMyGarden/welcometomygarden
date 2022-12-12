<script lang="ts">
  import type mapboxgl from 'maplibre-gl';
  import { getContext, onMount, onDestroy } from 'svelte';
  import key from './mapbox-context.js';
  import { fetchFrom } from '@/lib/util';
  import { DEFAULT_MAP_STYLE, ICON_SIZE, ZOOM_LEVELS } from '@/lib/constants.js';
  import { trainAllIcon } from '@/lib/images/markers/index.js';

  // @ts-ignore
  const { getMap } = getContext(key);
  const map: mapboxgl.Map = getMap();

  export let showTransport: boolean;
  export let showStations: boolean;
  export let showRails: boolean;
  let mapReady = false;
  let stationSourceAndLayerId = 'stations';
  const transportSourceAndLayerId = 'transport-source';

  const transportLayerSource = `https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${
    import.meta.env.VITE_THUNDERFOREST_API_KEY as string
  }`;

  const updateVisibility = (id: string, visible?: boolean) => {
    const layer = map.getLayer(id);
    if (layer) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
  };

  const addImagesToMap = async () => {
    try {
      const icon = { src: trainAllIcon, id: 'train-all' };
      await new Promise((resolve) => {
        let img = new Image(100, 100);
        img.onload = () => {
          if (!map.hasImage(icon.id)) map.addImage(icon.id, img);
          resolve(true);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(icon.src);
      });
    } catch (err) {
      console.log(err);
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
        visibility: showStations ? 'visible' : 'none',
        'icon-image': 'train-all',
        'icon-size': ICON_SIZE
      }
    });
  };

  const createRailways = () => {
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
      layer.id = `rails-${layer.id}`;
      layer.layout.visibility = showRails ? 'visible' : 'none';
    }
    railwayLayers.map((layer) => map.addLayer(layer));
  };

  const createTransport = () => {
    map.addSource(transportSourceAndLayerId, {
      type: 'raster',
      tiles: [transportLayerSource],
      tileSize: 256
    });

    map.addLayer({
      id: transportSourceAndLayerId,
      type: 'raster',
      source: transportSourceAndLayerId,
      layout: {
        visibility: showTransport ? 'visible' : 'none'
      }
    });
  };

  // This updates the visibility of the layers through the reactive statement based on the showStations and showRails props
  $: if (mapReady && false) {
    (map.getStyle().layers || [])
      .filter((layer) => layer.id.includes('rails-'))
      .map((layer) => updateVisibility(layer.id, showRails));
    updateVisibility(stationSourceAndLayerId, showStations);
  }

  $: if (mapReady) updateVisibility(transportSourceAndLayerId, showTransport);

  const setup = async () => {
    // Create the transport layer from thunderforest
    createTransport();

    // At this moment 12/12/2022 we decided to show the transport layer instead of the railways and stations
    if (false) {
      await addImagesToMap();
      createRailways();
      await createStations();
    }
    mapReady = true;
  };

  setup();
</script>

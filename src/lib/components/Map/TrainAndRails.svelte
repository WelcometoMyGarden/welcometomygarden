<script lang="ts">
  import type mapboxgl from 'maplibre-gl';
  import { getContext } from 'svelte';
  import key from './mapbox-context.js';

  // @ts-ignore
  const { getMap } = getContext(key);
  const map: mapboxgl.Map = getMap();

  interface Props {
    showTransport: boolean;
  }

  let { showTransport }: Props = $props();
  let mapReady = $state(false);
  const transportSourceAndLayerId = 'transport-source';

  const transportLayerSource = `https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${
    import.meta.env.VITE_THUNDERFOREST_API_KEY as string
  }`;

  const updateVisibility = (id: string, visible?: boolean) => {
    const layer = map.getLayer(id);
    if (layer) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
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

  $effect(() => {
    if (mapReady) updateVisibility(transportSourceAndLayerId, showTransport);
  });

  const setup = async () => {
    // Create the transport layer from thunderforest
    createTransport();
    mapReady = true;
  };

  setup();
</script>

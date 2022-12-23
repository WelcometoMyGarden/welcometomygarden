<script lang="ts">
  export let showHiking = false;
  export let showCycling = true;

  import { getContext } from 'svelte';
  import type { ContextType } from './Map.svelte';
  import key from './mapbox-context.js';

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  const getVisibilityProperty = (visibility: boolean) => (visibility ? 'visible' : 'none');

  const toggleHikingVisibility = (visible: boolean) => {
    map.setLayoutProperty('hiking-trails', 'visibility', getVisibilityProperty(visible));
  };

  const toggleCyclingVisibility = (visible: boolean) => {
    map.setLayoutProperty('cycling-trails', 'visibility', getVisibilityProperty(visible));
  };

  let toggleable = false;

  const setupTrails = () => {
    // Catch all errors to avoid having to reload when working on this component in development
    try {
      map.addSource('waymarked-hiking', {
        type: 'raster',
        tiles: ['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png'],
        tileSize: 256
      });

      map.addSource('waymarked-cycling', {
        type: 'raster',
        tiles: ['https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png'],
        tileSize: 256
      });

      map.addLayer({
        id: 'hiking-trails',
        type: 'raster',
        source: 'waymarked-hiking',
        layout: {
          visibility: getVisibilityProperty(showHiking)
        }
      });

      map.addLayer({
        id: 'cycling-trails',
        type: 'raster',
        source: 'waymarked-cycling',
        layout: {
          visibility: getVisibilityProperty(showCycling)
        }
      });
    } catch (err) {
      // should not error in prod
      console.log(err);
    } finally {
      toggleable = true;
    }
  };

  $: if (toggleable) toggleHikingVisibility(showHiking);
  $: if (toggleable) toggleCyclingVisibility(showCycling);

  setupTrails();
</script>

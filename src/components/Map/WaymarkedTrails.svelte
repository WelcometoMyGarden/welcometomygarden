<script>
  export let showHiking = false;
  export let showCycling = false;

  import { getContext, onMount } from 'svelte';
  import key from './mapbox-context.js';

  const { getMap } = getContext(key);
  const map = getMap();

  const toggleHikingVisibility = visible => {
    map.setLayoutProperty('hiking-trails', 'visibility', visible ? 'visible' : 'none');
  };

  const toggleCyclingVisibility = visible => {};

  $: toggleHikingVisibility(showHiking);
  $: toggleCyclingVisibility(showCycling);

  onMount(() => {
    map.addSource('waymarked-hiking', {
      type: 'raster',
      tiles: ['https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png'],
      tileSize: 256
    });

    map.addLayer({
      id: 'hiking-trails',
      type: 'raster',
      source: 'waymarked-hiking',
      layout: {
        visibility: showHiking
      }
    });
  });
</script>

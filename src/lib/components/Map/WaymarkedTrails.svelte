<script lang="ts">
  import { getContext } from 'svelte';
  import type { ContextType } from './Map.svelte';
  import key from './mapbox-context.js';
  import * as Sentry from '@sentry/sveltekit';
  import logger from '$lib/util/logger';
  interface Props {
    showHiking?: boolean;
    showCycling?: boolean;
  }

  let { showHiking = false, showCycling = true }: Props = $props();

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  const getVisibilityProperty = (visibility: boolean) => (visibility ? 'visible' : 'none');

  const toggleHikingVisibility = (visible: boolean) => {
    map.setLayoutProperty('hiking-trails', 'visibility', getVisibilityProperty(visible));
  };

  const toggleCyclingVisibility = (visible: boolean) => {
    map.setLayoutProperty('cycling-trails', 'visibility', getVisibilityProperty(visible));
  };

  let toggleable = $state(false);

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
      logger.log(err);
      Sentry.captureException(err, {
        extra: { context: 'Setting up Waymarked Trails layers' }
      });
    } finally {
      toggleable = true;
    }
  };

  $effect(() => {
    if (toggleable) {
      toggleHikingVisibility(showHiking);
      toggleCyclingVisibility(showCycling);
    }
  });

  setupTrails();
</script>

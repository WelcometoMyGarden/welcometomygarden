<script context="module" lang="ts">
  export type ContextType = { getMap: () => maplibregl.Map };
</script>

<script lang="ts">
  import { setContext, onMount, tick, afterUpdate } from 'svelte';
  import maplibregl, { type ResourceTypeEnum } from 'maplibre-gl';
  import key from './mapbox-context.js';
  import { isMapboxURL, transformMapboxUrl } from 'maplibregl-mapbox-request-transformer';

  import 'maplibre-gl/dist/maplibre-gl.css';
  import { DEFAULT_MAP_STYLE } from '@/lib/constants.js';

  export let lat: number;
  export let lon: number;
  export let zoom: number;
  export let applyZoom = false; // make this true if the provided zoom level should be applied
  export let recenterOnUpdate = false;
  export let initialLat = lat;
  export let initialLon = lon;
  export let jump = false;

  let container: HTMLElement;
  let map: maplibregl.Map;
  let loaded = false;

  let innerWidth: number;
  $: isMobile = innerWidth != null && innerWidth <= 700;
  const customAttribution = [
    `<a href="https://waymarkedtrails.org/" target="_blank" title="WaymarkedTrails">© Waymarked Trails</a>`,
    `<a href="https://www.thunderforest.com" target="_blank" title="Thunderforest">© Thunderforest</a>`
  ];

  setContext<ContextType>(key, {
    getMap: () => map
  });

  // See:
  // - The problematic breaking change in maplibre-gl-js v2:
  //  - https://github.com/maplibre/maplibre-gl-js/discussions/290
  //  - https://github.com/maplibre/maplibre-gl-js/releases/tag/v2.0.0
  // - The workaround package we're using here: https://github.com/rowanwins/maplibregl-mapbox-request-transformer
  const transformRequest = (url: string, resourceType?: ResourceTypeEnum) => {
    if (isMapboxURL(url)) {
      return transformMapboxUrl(
        url,
        // TODO: typing of this library is not up-to-date
        resourceType as string,
        import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
      );
    }
    return { url };
  };

  const fullAttribution = new maplibregl.AttributionControl({ customAttribution });
  const compactAttribution = new maplibregl.AttributionControl({
    compact: true,
    customAttribution
  });

  // TODO: switch based on user's location? (eg. US & others: imperial, EU: metric)
  const scaleControl = new maplibregl.ScaleControl({ unit: 'metric' });

  onMount(() => {
    map = new maplibregl.Map({
      container,
      style: DEFAULT_MAP_STYLE,
      center: [lon, lat],
      zoom,
      attributionControl: false,
      transformRequest,
      hash: false // TODO: discuss if we want this or not,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, showZoom: true }),
      'top-left'
    );
    // Default to full attribution
    map.addControl(fullAttribution, 'bottom-right');
    map.addControl(scaleControl, 'bottom-right');

    map.on('load', () => {
      loaded = true;
    });

    tick().then(() => {
      map.resize();
    });
  });

  /**
   * Ensures the scale control is always added last, which positions it on top.
   */
  const readdScaleControl = () => {
    map.removeControl(scaleControl);
    map.addControl(scaleControl, 'bottom-right');
  };

  afterUpdate(() => {
    if (isMobile && !map.hasControl(compactAttribution) && map.hasControl(fullAttribution)) {
      map.removeControl(fullAttribution);
      map.addControl(compactAttribution);
      // The scale control is not removed here, and hence moves to the bottom.
    } else if (
      !isMobile &&
      map.hasControl(compactAttribution) &&
      !map.hasControl(fullAttribution)
    ) {
      map.removeControl(compactAttribution);
      map.addControl(fullAttribution);
      readdScaleControl();
    }
  });

  $: if (map) {
    map.jumpTo({
      center: [initialLon, initialLat]
    });
  }

  $: if (recenterOnUpdate && map && initialLat !== lat && initialLon !== lon) {
    const zoomLevel = applyZoom ? zoom : map.getZoom();
    const params = { center: [lon, lat], zoom: zoomLevel };
    if (!jump) {
      map.flyTo({
        ...params,
        bearing: 0,
        speed: 1,
        curve: 1,
        essential: true
      });
    } else {
      map.jumpTo(params);
    }
  }
</script>

<svelte:window bind:innerWidth />

<div bind:this={container}>
  {#if map && loaded}
    <slot />
  {/if}
</div>

<style>
  div {
    width: 100%;
    height: 100%;
  }

  div :global(.maplibregl-canvas-container) {
    height: 100%;
  }
  div :global(canvas) {
    height: 100%;
  }
</style>

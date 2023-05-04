<script context="module" lang="ts">
  export type ContextType = { getMap: () => maplibregl.Map };
</script>

<script lang="ts">
  import { setContext, onMount, tick, afterUpdate, onDestroy } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import key from './mapbox-context.js';

  import 'maplibre-gl/dist/maplibre-gl.css';
  import { DEFAULT_MAP_STYLE } from '$lib/constants.js';
  import FullscreenControl from './FullscreenControl.js';
  import { isFullscreen } from '$lib/stores/fullscreen.js';

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

  maplibregl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  const fullAttribution = new maplibregl.AttributionControl({ customAttribution });
  const compactAttribution = new maplibregl.AttributionControl({
    compact: true,
    customAttribution
  });

  const scaleControl = new maplibregl.ScaleControl();
  const fullscreenControl: FullscreenControl | undefined = new FullscreenControl({
    // We can assume that <html> is already in the DOM, because the map only loads
    // after a log in, and by then the first render has happened.
    // TODO: this might break if we switch to SSR
    container: document.querySelector('html')!
  });

  onMount(() => {
    // Before loading the map, clear the mapbox.eventData.uuid:<token_piece>
    // So that Mapbox (Maplibre) GL JS v1.x will generate a new uuid, which prevents tracking our users.
    for (let i = 0; i < localStorage.length; i++) {
      const currentKey = localStorage.key(i);
      if (currentKey && currentKey.startsWith('mapbox.eventData.uuid')) {
        localStorage.removeItem(currentKey);
        // also delete all other event data of the form mapbox.eventData:<token_piece>
        const keyParts = currentKey.split(':');
        if (keyParts.length > 1) {
          let tokenPiece = keyParts[1];
          if (tokenPiece) {
            localStorage.removeItem(`mapbox.eventData:${tokenPiece}`);
          }
        }
      }
    }

    map = new maplibregl.Map({
      container,
      style: DEFAULT_MAP_STYLE,
      center: [lon, lat],
      zoom,
      attributionControl: false,
      hash: false // TODO: discuss if we want this or not
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, showZoom: true }),
      'top-left'
    );
    // Default to full attribution
    map.addControl(fullAttribution, 'bottom-right');
    map.addControl(scaleControl, 'bottom-right');

    // Add full screen control
    map.addControl(fullscreenControl);
    fullscreenControl.on('fullscreenstart', async () => {
      isFullscreen.set(true);
      document.body.style.cssText = '--height-footer: 0px; --height-nav: 0px';
      await tick();
      // The above did not always lead to a resize event on mobile
      map.resize();
    });
    fullscreenControl.on('fullscreenend', async () => {
      isFullscreen.set(false);
      document.body.style.cssText = '';
      await tick();
      map.resize();
    });

    map.on('load', () => {
      loaded = true;
    });

    tick().then(() => {
      map.resize();
    });
  });

  onDestroy(() => {
    if (fullscreenControl?._isFullscreen()) {
      fullscreenControl._exitFullscreen();
    }
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

  @media screen and (max-width: 700px) {
    /* Includes the FullscreenControl */
    :global(.maplibregl-ctrl-top-right) {
      top: 5.5rem;
      right: 0.2rem;
    }
  }
</style>

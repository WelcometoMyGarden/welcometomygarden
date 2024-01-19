<script context="module" lang="ts">
  import type { LongLat } from '$lib/types/Garden.js';
  export type ContextType = { getMap: () => maplibregl.Map };
  export const currentPosition = writable<LongLat | null>(null);
</script>

<script lang="ts">
  import { setContext, onMount, tick, afterUpdate, onDestroy } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import key from './mapbox-context.js';

  import 'maplibre-gl/dist/maplibre-gl.css';
  import {
    DEFAULT_MAP_STYLE,
    ZOOM_LEVELS,
    memberMaxZoom,
    nonMemberMaxZoom
  } from '$lib/constants.js';
  import FullscreenControl from './FullscreenControl.js';
  import { isFullscreen } from '$lib/stores/fullscreen.js';
  import { user } from '$lib/stores/auth.js';
  import {
    hasEnabledNotificationsOnCurrentDevice,
    isOnIDevicePWA
  } from '$lib/api/push-registrations.js';
  import { writable } from 'svelte/store';

  export let lat: number;
  export let lon: number;
  export let zoom: number;
  export let applyZoom = false; // make this true if the provided zoom level should be applied
  // Recenter when the lat & long params change
  export let recenterOnUpdate = false;
  export let enableGeolocation = true;
  export let isShowingGarden = false;

  // Was used to prevent an automatic jump to the GPS location after the initial map load.
  // TODO: reuse for IP-based geolocation
  let isAutoloadingLocation = false;

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

  const originalUpdateCamera = maplibregl.GeolocateControl.prototype._updateCamera;
  maplibregl.GeolocateControl.prototype._updateCamera = function (...args: any[]) {
    // -- Uncommented code: --
    // Don't update the camera if we're automatically loading the location on load
    // It might take 5+ seconds, resulting in weird jumps
    //
    // TODO: executive decision to keep the jump-to-location behavior
    // We can reuse this code when showing the location indicator after initializing
    // on an IP-based location. We also don't want it to jump then.
    // --
    if (isAutoloadingLocation && isShowingGarden) {
      console.log('Ignored geolocation camera update');
      return;
    }
    originalUpdateCamera.apply(this, args);
  };
  const geolocationControl = new maplibregl.GeolocateControl({
    trackUserLocation: !!$user?.superfan,
    showUserLocation: !!$user?.superfan,
    fitBoundsOptions: {
      maxZoom: ZOOM_LEVELS.SMALL_COUNTRY
    },
    positionOptions: {
      // Enable high accuracy when the location was not automatically activated on load
      // but will be manually requested. Might be slower (so bad on load), but can give
      // more accurate results.
      enableHighAccuracy: true
    }
  });

  /**
   * Loads the map and inserts it into the DOM
   */
  const addMap = () => {
    // Load map
    map = new maplibregl.Map({
      container,
      style: DEFAULT_MAP_STYLE,
      center: [lon, lat],
      zoom,
      /** https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters */
      maxZoom: $user?.superfan ? memberMaxZoom : nonMemberMaxZoom,
      attributionControl: false,
      hash: false // TODO: discuss if we want this or not,
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

    return map;
  };

  onMount(async () => {
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

    let geolocationPermission: string;

    // We noticed a bug where the map broke on iOS 15.2 due to "query" not existing on the permissions
    // object; while it actually supports geolocation
    //
    // From:  https://github.com/mapbox/mapbox-gl-js/blob/d8827408c6f4c4ceecba517931c96dda8bb261a1/src/ui/control/geolocate_control.js#L175-L177
    // > navigator.permissions has incomplete browser support http://caniuse.com/#feat=permissions-api
    // > Test for the case where a browser disables Geolocation because of an insecure origin;
    // > in some environments like iOS16 WebView, permissions reject queries but still support geolocation
    const geolocationObjectExists = !!navigator.geolocation;
    // on iOS <= 16, I don't think we can know the state. But 'prompt' is safe to assume?
    // because actually attempting a geolocation may result in a prompt / error / location
    // The purpose of this `geolocationPermission` is to decide whether or not to add the
    // geolocation control, and whether or not to try to trigger it automatically (see further on).
    const assumedState = geolocationObjectExists ? 'prompt' : 'not-available';
    if ('geolocation' in navigator && navigator?.permissions?.query !== undefined) {
      // Query if possible
      geolocationPermission = await navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => result.state)
        // fall back to assumed state
        .catch(() => assumedState);
    } else {
      // fall back to assumed state if queries are not possible
      geolocationPermission = assumedState;
    }

    addMap();

    // Initialize geolocation
    if (
      enableGeolocation &&
      geolocationPermission !== 'not-available' &&
      geolocationPermission !== 'denied'
    ) {
      const canPromptForLocationPermissionOnLoad =
        (!isOnIDevicePWA() || hasEnabledNotificationsOnCurrentDevice()) && !isShowingGarden;

      let shouldTriggerGeolocation =
        // It won't prompt if granted
        (geolocationPermission === 'granted' ||
          (geolocationPermission === 'prompt' && canPromptForLocationPermissionOnLoad)) &&
        // Only trigger geolocation for non-members when a garden isn't being shown specifically
        (!!$user?.superfan || !isShowingGarden);

      if (geolocationPermission === 'granted' && shouldTriggerGeolocation) {
        // Mark the map as autoloading if we have permission and should trigger geolocation
        isAutoloadingLocation = true;
      }

      map.addControl(geolocationControl);

      // Trigger geolocation
      if (shouldTriggerGeolocation) {
        map.on('load', () => {
          geolocationControl.trigger();

          if (isAutoloadingLocation) {
            geolocationControl.once('geolocate', () => {
              console.log('Geolocation autoloaded');
              // When we're watching
              if ((geolocationControl as any).options.trackUserLocation) {
                console.log('Forcing background location tracking');
                geolocationControl._watchState = 'BACKGROUND';
              }
              isAutoloadingLocation = false;
            });
          }
        });
      }

      // Sync current position to app state
      geolocationControl.on(
        'geolocate',
        ({ coords: { longitude, latitude } }: GeolocationPosition) =>
          ($currentPosition = { longitude, latitude })
      );
    }

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
    if (map && isMobile && !map.hasControl(compactAttribution) && map.hasControl(fullAttribution)) {
      map.removeControl(fullAttribution);
      map.addControl(compactAttribution);
      // The scale control is not removed here, and hence moves to the bottom.
    } else if (
      map &&
      !isMobile &&
      map.hasControl(compactAttribution) &&
      !map.hasControl(fullAttribution)
    ) {
      map.removeControl(compactAttribution);
      map.addControl(fullAttribution);
      readdScaleControl();
    }
  });

  // When the given lon/lat change (and other referenced params), this will recenter
  $: if (recenterOnUpdate && map) {
    const zoomLevel = applyZoom ? zoom : map.getZoom();
    const params = { center: [lon, lat], zoom: zoomLevel };
    if (!isShowingGarden) {
      map.flyTo({
        ...params,
        bearing: 0,
        speed: 1,
        curve: 1,
        essential: true
      });
    } else {
      // Immediately change params
      map.jumpTo(params);
    }
  }
</script>

<svelte:window bind:innerWidth />

<div bind:this={container}>
  <!-- Show map UI if the map is loaded -->
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

  /* Override the default pulsating dot animation, which is distracting */
  :global(.mapboxgl-user-location-dot:before, .maplibregl-user-location-dot:before) {
    animation: none;
  }

  /* If geolocation is not available, hide the Mapbox button */
  :global(
      .mapboxgl-ctrl button.mapboxgl-ctrl-geolocate:disabled,
      .maplibregl-ctrl button.maplibregl-ctrl-geolocate:disabled
    ) {
    display: none;
  }

  @media screen and (max-width: 700px) {
    /* Includes the FullscreenControl */
    :global(.maplibregl-ctrl-top-right) {
      top: 5.5rem;
      right: 0.2rem;
    }
  }
</style>

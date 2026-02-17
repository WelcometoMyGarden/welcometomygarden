<script module lang="ts">
  import type { LongLat } from '$lib/types/Garden';
  import { writable, derived } from 'svelte/store';
  import { lr } from '$lib/util/translation-helpers';
  import { page } from '$app/stores';
  import type { Map, LngLat } from 'mapbox-gl';
  export type ContextType = { getMap: () => Map };
  export const currentPosition = writable<LongLat | null>(null);
  export const mapState = writable<{
    zoom: number;
    center: LngLat;
    gardenId?: string;
  } | null>(null);

  export const signInLinkWithGarden = derived([page, mapState, lr], ([$page, _, $lr]) => {
    if (typeof $page.params.gardenId === 'string') {
      return createUrl($lr(routes.SIGN_IN), {
        continueUrl: `${$lr(routes.MAP)}/garden/${$page.params.gardenId}`
      });
    }
    return $lr(routes.SIGN_IN);
  });
  import mapboxgl from 'mapbox-gl';
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  import 'mapbox-gl/dist/mapbox-gl.css';
</script>

<!-- @component
Component for maps. Shared between the main map, and the map in the Garden creation form.
 -->

<script lang="ts">
  import { setContext, onMount, tick, onDestroy, type Snippet } from 'svelte';
  import key from './mapbox-context.js';
  import { DEFAULT_MAP_STYLE, MOBILE_BREAKPOINT, ZOOM_LEVELS } from '$lib/constants';
  import { isFullscreen } from '$lib/stores/fullscreen';
  import { user } from '$lib/stores/auth';
  import { hasEnabledNotificationsOnCurrentDevice } from '$lib/api/push-registrations';
  import { isOnIDevicePWA } from '$lib/util/push-registrations';
  import { beforeNavigate } from '$app/navigation';
  import routes from '$lib/routes';
  import createUrl from '$lib/util/create-url';
  import { innerWidth } from 'svelte/reactivity/window';
  import logger from '$lib/util/logger.js';
  import { Capacitor } from '@capacitor/core';
  import FullscreenControl from './FullscreenControl';

  type Props = {
    lat: number;
    lon: number;
    zoom: number;
    applyZoom: boolean; // make this true if the provided zoom level should be applied
    maxZoom: number;
    // Recenter when the lat & long params change
    recenterOnUpdate: boolean;
    enableGeolocation?: boolean;
    isShowingGardenOnInit?: boolean;
    children: Snippet;
  };

  let {
    lat,
    lon,
    zoom,
    applyZoom = false, // make this true if the provided zoom level should be applied
    maxZoom = ZOOM_LEVELS.MAX,
    // Recenter when the lat & long params change
    recenterOnUpdate = false,
    enableGeolocation = true,
    isShowingGardenOnInit = false,
    children
  }: Props = $props();

  // Was used to prevent an automatic jump to the GPS location after the initial map load.
  // TODO: reuse for IP-based geolocation
  let isAutoloadingLocation = false;

  let container: HTMLElement;
  let map: Map | undefined = $state();
  let loaded = $state(false);
  const isMobile = $derived(innerWidth.current != null && innerWidth.current <= MOBILE_BREAKPOINT);

  const customAttribution = [
    `<a href="https://waymarkedtrails.org/" target="_blank" title="WaymarkedTrails">© Waymarked Trails</a>`,
    `<a href="https://www.thunderforest.com" target="_blank" title="Thunderforest">© Thunderforest</a>`
  ];

  // We only render the child components when the map is loaded,
  // hence it can be considered defined
  setContext<ContextType>(key, {
    getMap: () => map!
  });

  const fullAttribution = new mapboxgl.AttributionControl({ customAttribution });
  const compactAttribution = new mapboxgl.AttributionControl({
    compact: true,
    customAttribution
  });

  const scaleControl = new mapboxgl.ScaleControl();
  const fullscreenControl: FullscreenControl | undefined = new FullscreenControl({
    // We can assume that <html> is already in the DOM, because the map only loads
    // after a log in, and by then the first render has happened.
    // TODO: this might break if we switch to SSR
    container: document.querySelector('html')!
  });

  const originalUpdateCamera = mapboxgl.GeolocateControl.prototype._updateCamera;
  mapboxgl.GeolocateControl.prototype._updateCamera = function (...args: any[]) {
    // -- Uncommented code: --
    // Don't update the camera if we're automatically loading the location on load
    // It might take 5+ seconds, resulting in weird jumps
    //
    // TODO: executive decision to keep the jump-to-location behavior
    // We can reuse this code when showing the location indicator after initializing
    // on an IP-based location. We also don't want it to jump then.
    // --
    if (isAutoloadingLocation && isShowingGardenOnInit) {
      logger.log('Ignored geolocation camera update');
      return;
    }
    originalUpdateCamera.apply(this, args);
  };
  const geolocationControl = new mapboxgl.GeolocateControl({
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
    map = new mapboxgl.Map({
      container,
      style: DEFAULT_MAP_STYLE,
      center: [lon, lat],
      zoom,
      /** https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters */
      maxZoom,
      attributionControl: false,
      hash: false, // TODO: discuss if we want this or not,
      // Disable rotating and changing pitch (tilt) on mobile & desktop
      dragRotate: false,
      touchPitch: false
    });

    map.touchZoomRotate.disableRotation();

    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false, showZoom: true }),
      'top-left'
    );
    // Default to full attribution
    map.addControl(fullAttribution, 'bottom-right');
    map.addControl(scaleControl, 'bottom-right');

    // Add full screen control
    if (!Capacitor.isNativePlatform()) {
      map.addControl(fullscreenControl);

      fullscreenControl.on('fullscreenstart', async () => {
        isFullscreen.set(true);
        document.body.style.cssText = '--height-footer: 0px; --height-nav: 0px';
        await tick();
        // The above did not always lead to a resize event on mobile
        map!.resize();
      });

      fullscreenControl.on('fullscreenend', async () => {
        isFullscreen.set(false);
        document.body.style.cssText = '';
        await tick();
        map!.resize();
      });
    }

    return map;
  };

  onMount(async () => {
    // Before loading the map, clear the mapbox.eventData.uuid:<token_piece>
    // So that Mapbox (mapbox) GL JS v1.x will generate a new uuid, which prevents tracking our users.
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
        (!isOnIDevicePWA() || hasEnabledNotificationsOnCurrentDevice()) && !isShowingGardenOnInit;

      let shouldTriggerGeolocation =
        // It won't prompt if granted
        (geolocationPermission === 'granted' ||
          (geolocationPermission === 'prompt' && canPromptForLocationPermissionOnLoad)) &&
        // Only trigger geolocation for non-members when a garden isn't being shown specifically
        (!!$user?.superfan || !isShowingGardenOnInit);

      if (geolocationPermission === 'granted' && shouldTriggerGeolocation) {
        // Mark the map as autoloading if we have permission and should trigger geolocation
        isAutoloadingLocation = true;
      }

      map!.addControl(geolocationControl);

      // Trigger geolocation
      if (shouldTriggerGeolocation) {
        map!.on('load', () => {
          geolocationControl.trigger();

          if (isAutoloadingLocation) {
            geolocationControl.once('geolocate', () => {
              logger.log('Geolocation autoloaded');
              // When we're watching
              if ((geolocationControl as any).options.trackUserLocation) {
                logger.log('Forcing background location tracking');
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

    map!.on('load', () => {
      loaded = true;
    });

    tick().then(() => {
      map!.resize();
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
    map!.removeControl(scaleControl);
    map!.addControl(scaleControl, 'bottom-right');
  };

  $effect(() => {
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
  $effect(() => {
    if (recenterOnUpdate && map) {
      const zoomLevel = applyZoom ? zoom : map.getZoom();
      const params = { center: [lon, lat], zoom: zoomLevel };
      if (!isShowingGardenOnInit) {
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
  });

  beforeNavigate(() => {
    // Save map state
    if (!map) return;
    $mapState = {
      zoom: map.getZoom(),
      center: map.getCenter(),
      gardenId: $page.params.gardenId
    };
  });
</script>

<div bind:this={container}>
  <!-- Show map UI if the map is loaded -->
  {#if map && loaded}
    {@render children?.()}
  {/if}
</div>

<style>
  div {
    width: 100%;
    height: 100%;
  }

  div :global(.mapboxgl-canvas-container) {
    height: 100%;
  }
  div :global(canvas) {
    height: 100%;
  }

  /* Override the default pulsating dot animation, which is distracting */
  :global(.mapboxgl-user-location-dot:before, .mapboxgl-user-location-dot:before) {
    animation: none;
  }

  /* If geolocation is not available, hide the Mapbox button */
  :global(
    .mapboxgl-ctrl button.mapboxgl-ctrl-geolocate:disabled,
    .mapboxgl-ctrl button.mapboxgl-ctrl-geolocate:disabled
  ) {
    display: none;
  }

  @media screen and (max-width: 700px) {
    /* Includes the FullscreenControl */
    :global(.mapboxgl-ctrl-top-right) {
      top: 5.5rem;
      right: 0.2rem;
    }
  }

  :global(.app.native.ios .mapboxgl-ctrl-top-right) {
    top: 10rem;
  }
</style>

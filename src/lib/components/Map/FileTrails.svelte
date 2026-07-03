<script lang="ts">
  import type { ContextType } from './Map.svelte';
  import type { GeoJSONSource, Marker } from 'mapbox-gl';
  import mapboxgl from 'mapbox-gl';
  import { fileDataLayers } from '$lib/stores/file';
  import {
    routeTweaks,
    type RouteTweaks,
    type EndpointMode,
    currentMapZoom,
    effectiveKm
  } from '$lib/stores/routeTweaks';
  import { getContext, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { bbox } from '@turf/bbox';
  import key from './mapbox-context.js';
  import { ZOOM_LEVELS } from '$lib/constants';
  import type { FileDataLayer } from '$lib/types/DataLayer';
  import type { FeatureCollection, Point } from 'geojson';
  import {
    clusterEndpoints,
    colorForRoute,
    computeEndpointStyle,
    computeKmMarkers,
    computeOverlapSegments,
    computeStartEnd,
    evaluateZoomInterval,
    parseZoomIntervalConfig,
    type RouteEndpoint
  } from '$lib/util/map/routeStyle';
  import * as Sentry from '@sentry/sveltekit';
  import logger from '$lib/util/logger';

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  const EMPTY_KM: FeatureCollection<Point, { label: string }> = {
    type: 'FeatureCollection',
    features: []
  };

  // Effective km marker interval + opacity for the current zoom level (driven by the
  // zoom→interval config in the tweaks store). `effInterval === null` => no markers.
  let effInterval: number | null = null;
  let effOpacity = 0;

  /** Recomputes the effective interval/opacity from the live zoom + config. */
  const refreshEffective = () => {
    const zoom = map.getZoom();
    currentMapZoom.set(zoom);
    const rules = parseZoomIntervalConfig(get(routeTweaks).zoomIntervalConfig);
    const result = evaluateZoomInterval(rules, zoom);
    effInterval = result ? result.interval : null;
    effOpacity = result ? result.opacity : 0;
    effectiveKm.set(result);
  };

  const kmMarkersFor = (geoJson: FileDataLayer['geoJson']) =>
    effInterval != null ? computeKmMarkers(geoJson, effInterval) : EMPTY_KM;

  // Effective km marker opacity: the zoom-driven fade, unless fading is disabled — in
  // which case markers simply snap between fully visible and hidden.
  const kmOpacity = () => (get(routeTweaks).fadeKmMarkers ? effOpacity : effOpacity > 0 ? 1 : 0);

  // Route line opacity: reduced when the "transparent routes" tweak is on, so the
  // underlying road stays visible through the line.
  const ROUTE_OPACITY = 0.8;
  const ROUTE_OPACITY_TRANSPARENT = 0.45;
  const OVERLAP_OPACITY = 0.9;
  const OVERLAP_OPACITY_TRANSPARENT = 0.5;
  const lineOpacity = () =>
    get(routeTweaks).transparentRoutes ? ROUTE_OPACITY_TRANSPARENT : ROUTE_OPACITY;
  const overlapOpacity = () =>
    get(routeTweaks).transparentRoutes ? OVERLAP_OPACITY_TRANSPARENT : OVERLAP_OPACITY;

  // Layer/source id helpers (the base `id` stays the line layer/source, for backwards compat).
  const kmSourceId = (id: string) => `${id}__km`;
  const kmCircleId = (id: string) => `${id}__km-circle`;
  const kmLabelId = (id: string) => `${id}__km-label`;
  const nameLabelId = (id: string) => `${id}__name`;

  /** The label shown along a route: the file name minus its extension. */
  const routeNameFor = (layer: FileDataLayer) =>
    (layer.originalFileName ?? '').replace(/\.[^./\\]+$/, '');

  // Track rendered trail layers + the global set of endpoint DOM markers.
  const rendered = new Set<string>();
  let endpointMarkers: Marker[] = [];

  const BASE_MARKER_SIZE = 24; // px, badge diameter at full size ('icons' mode)
  // In 'flags' mode, match the km markers' diameter (2 * their circle-radius, see
  // the km circle layer paint below) instead of the icon badge size.
  const KM_MARKER_DIAMETER = 18; // px, must track 'circle-radius' on the km circle layer

  // 'flags' and 'dots' both draw plain circular badges sized to the km markers.
  const baseMarkerSizeFor = (mode: EndpointMode) =>
    mode === 'flags' || mode === 'dots' ? KM_MARKER_DIAMETER : BASE_MARKER_SIZE;

  // Solid badge colours shared by the 'flags' (start) and 'dots' (start/end/merged) modes.
  const BADGE_GREEN = 'rgba(27, 120, 55, 0.92)';
  const BADGE_RED = 'rgba(216, 67, 33, 0.92)';

  const fitToTrail = (geoJson: FileDataLayer['geoJson']) => {
    try {
      const bboxBounds = <[number, number, number, number]>bbox(geoJson).slice(0, 4);
      map.fitBounds(bboxBounds, {
        padding: { top: 150, bottom: 150, left: 50, right: 50 },
        maxZoom: ZOOM_LEVELS.ROAD,
        linear: true
      });
    } catch (error) {
      logger.error(error);
      Sentry.captureException(error, { extra: { context: 'Adding trail' } });
    }
  };

  const setLayerVisibility = (id: string, visible: boolean) => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  };

  // Per-type marker config: icon svg, base svg size (px) and badge background.
  // The start (play) icon is a bit larger so it reads as balanced next to the square.
  const ENDPOINT_CONFIG = {
    start: {
      svgBase: 14,
      background: 'rgba(27, 120, 55, 0.82)', // green
      icon: '<path d="M8 6v12l11-6z"/>' // filled play (triangle)
    },
    end: {
      svgBase: 11,
      background: 'rgba(216, 67, 33, 0.82)', // red-orange
      icon: '<rect x="5" y="5" width="14" height="14" rx="1.5"/>' // filled stop (square)
    },
    pause: {
      svgBase: 12,
      background: 'rgba(30, 58, 138, 0.82)', // dark blue
      icon: '<rect x="6.5" y="5" width="3.5" height="14" rx="1"/><rect x="14" y="5" width="3.5" height="14" rx="1"/>' // pause (two bars)
    }
  } as const;

  // A 4×4 black/white checkerboard filling the badge, clipped to the circle — a
  // finish flag. Stretched to fill via preserveAspectRatio="none".
  const CHECKERBOARD_SVG =
    '<svg viewBox="0 0 4 4" preserveAspectRatio="none" width="100%" height="100%" ' +
    'fill="#111" style="display:block"><rect width="4" height="4" fill="#fff"/>' +
    [0, 1, 2, 3]
      .flatMap((r) =>
        [0, 1, 2, 3]
          .filter((c) => (r + c) % 2 === 0)
          .map((c) => `<rect x="${c}" y="${r}" width="1" height="1"/>`)
      )
      .join('') +
    '</svg>';

  const createEndpointElement = (type: RouteEndpoint['type'], mode: EndpointMode) => {
    const baseSize = baseMarkerSizeFor(mode);
    const el = document.createElement('div');
    // `display:flex` lives in the global .trail-endpoint rule below, because mapbox
    // clears the inline `display` property it sets on marker elements.
    el.classList.add('trail-endpoint');
    el.style.cssText =
      `width:${baseSize}px;height:${baseSize}px;border-radius:50%;` +
      'align-items:center;justify-content:center;line-height:0;overflow:hidden;' +
      'border:2px solid #fff;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,0.4);';

    if (mode === 'flags') {
      if (type === 'start') {
        // Plain, mostly-opaque green circle (no icon).
        el.style.background = BADGE_GREEN;
      } else {
        // End & merged (pause) => checkerboard finish badge.
        el.style.background = '#fff';
        el.innerHTML = CHECKERBOARD_SVG;
      }
      return el;
    }

    if (mode === 'dots') {
      // Green circle (start), red circle (end) and a vertically split
      // half-green/half-red circle for merged start+end points.
      if (type === 'start') el.style.background = BADGE_GREEN;
      else if (type === 'end') el.style.background = BADGE_RED;
      else
        el.style.background = `linear-gradient(90deg, ${BADGE_GREEN} 0 50%, ${BADGE_RED} 50% 100%)`;
      return el;
    }

    // 'icons' mode (status quo): play / stop / pause glyphs.
    const { svgBase, background, icon } = ENDPOINT_CONFIG[type];
    el.dataset.svgBase = `${svgBase}`;
    el.style.background = background;
    el.innerHTML =
      `<svg width="${svgBase}" height="${svgBase}" viewBox="0 0 24 24" fill="#fff" ` +
      `style="display:block">${icon}</svg>`;
    return el;
  };

  /** Applies the current zoom-based scale & opacity to all endpoint markers. */
  const applyEndpointStyle = () => {
    const { scale, opacity } = computeEndpointStyle(map.getZoom());
    const size = baseMarkerSizeFor(get(routeTweaks).endpointMode) * scale;
    for (const marker of endpointMarkers) {
      const el = marker.getElement();
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderWidth = `${Math.max(1, 2 * scale)}px`;
      el.style.opacity = `${opacity}`;
      // Only fixed-size glyph svgs are resized; the checkerboard svg fills the badge
      // (width/height 100%) and scales automatically with it.
      const svg = el.querySelector('svg');
      if (svg && el.dataset.svgBase) {
        const svgSize = Number(el.dataset.svgBase) * scale;
        svg.setAttribute('width', `${svgSize}`);
        svg.setAttribute('height', `${svgSize}`);
      }
    }
  };

  /**
   * Rebuilds the global set of start/end markers from all *visible* trails, merging
   * endpoints within 5 m of each other into a single midpoint start marker.
   */
  const rebuildEndpointMarkers = () => {
    endpointMarkers.forEach((marker) => marker.remove());
    endpointMarkers = [];

    if (!get(routeTweaks).showStartEndMarkers) return;
    const mode = get(routeTweaks).endpointMode;

    const endpoints: RouteEndpoint[] = [];
    for (const layer of get(fileDataLayers)) {
      if (layer.visible === false) continue;
      const ends = computeStartEnd(layer.geoJson);
      if (!ends) continue;
      endpoints.push({ type: 'start', lngLat: ends.start as [number, number] });
      endpoints.push({ type: 'end', lngLat: ends.end as [number, number] });
    }

    for (const ep of clusterEndpoints(endpoints)) {
      const marker = new mapboxgl.Marker({ element: createEndpointElement(ep.type, mode) })
        .setLngLat(ep.lngLat)
        .addTo(map);
      endpointMarkers.push(marker);
    }

    applyEndpointStyle();
  };

  const applyVisibility = (layer: FileDataLayer, tweaks: RouteTweaks) => {
    const lineVisible = layer.visible !== false;
    setLayerVisibility(layer.id, lineVisible);

    const kmVisible = lineVisible && tweaks.showKmMarkers;
    setLayerVisibility(kmCircleId(layer.id), kmVisible);
    setLayerVisibility(kmLabelId(layer.id), kmVisible);

    const nameVisible = lineVisible && tweaks.showRouteNames;
    setLayerVisibility(nameLabelId(layer.id), nameVisible);
  };

  const renderTrail = (layer: FileDataLayer, color: string, tweaks: RouteTweaks) => {
    const { id, geoJson } = layer;
    const isNew = !map.getSource(id);

    // --- Route line ---
    if (isNew) {
      map.addSource(id, { type: 'geojson', data: geoJson });
    } else {
      (map.getSource(id) as GeoJSONSource | undefined)?.setData(geoJson);
    }

    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-width': 7, 'line-color': color, 'line-opacity': lineOpacity() }
      });
    } else {
      map.setPaintProperty(id, 'line-color', color);
      map.setPaintProperty(id, 'line-opacity', lineOpacity());
    }

    // Zoom to the trail only when we just added it locally.
    if (isNew && layer.animate) fitToTrail(geoJson);

    // --- Kilometre markers ---
    const kmData = kmMarkersFor(geoJson);
    if (!map.getSource(kmSourceId(id))) {
      map.addSource(kmSourceId(id), { type: 'geojson', data: kmData });
    } else {
      (map.getSource(kmSourceId(id)) as GeoJSONSource | undefined)?.setData(kmData);
    }

    if (!map.getLayer(kmCircleId(id))) {
      map.addLayer({
        id: kmCircleId(id),
        type: 'circle',
        source: kmSourceId(id),
        paint: {
          'circle-color': 'rgba(255, 255, 255, 0.75)',
          'circle-radius': 9,
          'circle-opacity': kmOpacity(),
          'circle-stroke-width': 1.5,
          'circle-stroke-color': color,
          'circle-stroke-opacity': kmOpacity()
        }
      });
    } else {
      map.setPaintProperty(kmCircleId(id), 'circle-stroke-color', color);
      map.setPaintProperty(kmCircleId(id), 'circle-opacity', kmOpacity());
      map.setPaintProperty(kmCircleId(id), 'circle-stroke-opacity', kmOpacity());
    }

    if (!map.getLayer(kmLabelId(id))) {
      map.addLayer({
        id: kmLabelId(id),
        type: 'symbol',
        source: kmSourceId(id),
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: { 'text-color': color, 'text-opacity': kmOpacity() }
      });
    } else {
      map.setPaintProperty(kmLabelId(id), 'text-color', color);
      map.setPaintProperty(kmLabelId(id), 'text-opacity', kmOpacity());
    }

    // --- Route name label (repeated along the line) ---
    const routeName = routeNameFor(layer);
    if (!map.getLayer(nameLabelId(id))) {
      map.addLayer({
        id: nameLabelId(id),
        type: 'symbol',
        source: id,
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': 250,
          'text-field': routeName,
          'text-size': 13,
          'text-max-angle': 40,
          'text-keep-upright': true
        },
        paint: {
          'text-color': color,
          'text-halo-color': 'rgba(255, 255, 255, 0.9)',
          'text-halo-width': 1.5
        }
      });
    } else {
      map.setLayoutProperty(nameLabelId(id), 'text-field', routeName);
      map.setPaintProperty(nameLabelId(id), 'text-color', color);
    }

    // Start/end markers are managed globally (see rebuildEndpointMarkers).

    // --- Visibility ---
    applyVisibility(layer, tweaks);

    rendered.add(id);
  };

  const removeTrail = (id: string) => {
    [nameLabelId(id), kmLabelId(id), kmCircleId(id), id].forEach((layerId) => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    });
    if (map.getSource(kmSourceId(id))) map.removeSource(kmSourceId(id));
    if (map.getSource(id)) map.removeSource(id);

    rendered.delete(id);
  };

  const moveToTop = (layerId: string) => {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  };

  /** Brings a trail's line and km marker layers above everything else. */
  const raiseTrail = (id: string) => {
    moveToTop(id);
    moveToTop(nameLabelId(id));
    moveToTop(kmCircleId(id));
    moveToTop(kmLabelId(id));
  };

  // Shared-segment overlap layers (only used in 'kmOnTopOverlap' mode).
  const OVERLAP_SOURCE = '__route-overlaps';
  const OVERLAP_LAYER_A = '__route-overlaps-a';
  const OVERLAP_LAYER_B = '__route-overlaps-b';

  // Signature of the inputs the last overlap computation was based on, so the
  // (expensive) scan is skipped when unrelated tweaks change (e.g. km config edits).
  let lastOverlapSig = '';

  const removeOverlapLayers = () => {
    [OVERLAP_LAYER_B, OVERLAP_LAYER_A].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(OVERLAP_SOURCE)) map.removeSource(OVERLAP_SOURCE);
    lastOverlapSig = '';
  };

  /**
   * In overlap mode, detects where routes share the same path and draws those stretches
   * as a single line alternating the two routes' colours (solid colour A + dashed
   * colour B on top). No-op / cleanup in other modes.
   */
  const applyOverlaps = () => {
    if (get(routeTweaks).routeLayerMode !== 'kmOnTopOverlap') {
      removeOverlapLayers();
      return;
    }

    // Keep the overlap-line opacity in sync with the "transparent routes" tweak. Done
    // before the signature short-circuit below, which only tracks route ids/colours.
    if (map.getLayer(OVERLAP_LAYER_A)) {
      map.setPaintProperty(OVERLAP_LAYER_A, 'line-opacity', overlapOpacity());
    }
    if (map.getLayer(OVERLAP_LAYER_B)) {
      map.setPaintProperty(OVERLAP_LAYER_B, 'line-opacity', overlapOpacity());
    }

    const tweaks = get(routeTweaks);
    const routes = get(fileDataLayers)
      .map((layer, index) => ({
        id: layer.id,
        color: colorForRoute(index, tweaks.useMultipleColors),
        geoJson: layer.geoJson,
        visible: layer.visible !== false
      }))
      .filter((r) => r.visible);

    // Recompute only when the routes or their colours actually changed.
    const sig = routes.map((r) => `${r.id}:${r.color}`).join(',');
    if (sig === lastOverlapSig && map.getSource(OVERLAP_SOURCE)) return;
    lastOverlapSig = sig;

    const data = computeOverlapSegments(routes);

    if (!map.getSource(OVERLAP_SOURCE)) {
      map.addSource(OVERLAP_SOURCE, { type: 'geojson', data });
    } else {
      (map.getSource(OVERLAP_SOURCE) as GeoJSONSource | undefined)?.setData(data);
    }

    if (!map.getLayer(OVERLAP_LAYER_A)) {
      map.addLayer({
        id: OVERLAP_LAYER_A,
        type: 'line',
        source: OVERLAP_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-width': 7,
          'line-color': ['get', 'colorA'],
          'line-opacity': overlapOpacity()
        }
      });
    }
    if (!map.getLayer(OVERLAP_LAYER_B)) {
      map.addLayer({
        id: OVERLAP_LAYER_B,
        type: 'line',
        source: OVERLAP_SOURCE,
        layout: { 'line-join': 'round', 'line-cap': 'butt' },
        paint: {
          'line-width': 7,
          'line-color': ['get', 'colorB'],
          'line-opacity': overlapOpacity(),
          'line-dasharray': [2, 2]
        }
      });
    }
  };

  // Per-layer hover/click handlers active in 'raiseOnHover' mode.
  let lineEventBindings: {
    event: 'mouseenter' | 'mouseleave' | 'click';
    id: string;
    fn: () => void;
  }[] = [];

  const clearLineEvents = () => {
    lineEventBindings.forEach(({ event, id, fn }) => map.off(event, id, fn));
    lineEventBindings = [];
  };

  const currentTrailIds = () =>
    get(fileDataLayers)
      .map((layer) => layer.id)
      .filter((id) => map.getLayer(id));

  /** Moves the overlap lines and all km marker layers above everything else. */
  const stackKmOnTop = () => {
    moveToTop(OVERLAP_LAYER_A);
    moveToTop(OVERLAP_LAYER_B);
    currentTrailIds().forEach((id) => moveToTop(nameLabelId(id)));
    currentTrailIds().forEach((id) => moveToTop(kmCircleId(id)));
    currentTrailIds().forEach((id) => moveToTop(kmLabelId(id)));
  };

  /**
   * Applies the current layer-stacking mode to the trail layers (and wires up the
   * hover/tap handlers for the raise modes).
   */
  const applyLayerMode = () => {
    clearLineEvents();
    const mode = get(routeTweaks).routeLayerMode;
    const ids = currentTrailIds();

    const kmOnTop = mode === 'kmOnTop' || mode === 'kmOnTopHover' || mode === 'kmOnTopOverlap';

    if (kmOnTop) {
      // Lines first, then overlap lines, then all km circles & labels => markers on top.
      ids.forEach((id) => moveToTop(id));
      stackKmOnTop();
    } else {
      // 'default' and 'raiseOnHover' share the per-route interleaved base order.
      ids.forEach((id) => raiseTrail(id));
    }

    if (mode === 'raiseOnHover' || mode === 'kmOnTopHover') {
      // In 'kmOnTopHover' only the stroke is raised (km markers must stay on top);
      // in 'raiseOnHover' the whole route (stroke + its km markers) is raised.
      const raise =
        mode === 'kmOnTopHover'
          ? (id: string) => {
              moveToTop(id);
              stackKmOnTop();
            }
          : (id: string) => raiseTrail(id);

      ids.forEach((id) => {
        const enter = () => {
          raise(id);
          map.getCanvas().style.cursor = 'pointer';
        };
        const leave = () => {
          map.getCanvas().style.cursor = '';
        };
        const click = () => raise(id);
        map.on('mouseenter', id, enter);
        map.on('mouseleave', id, leave);
        map.on('click', id, click);
        lineEventBindings.push(
          { event: 'mouseenter', id, fn: enter },
          { event: 'mouseleave', id, fn: leave },
          { event: 'click', id, fn: click }
        );
      });
    }
  };

  /** Full reconcile of the map against the current trails + tweaks state. */
  const sync = () => {
    refreshEffective();
    const layers = get(fileDataLayers);
    const tweaks = get(routeTweaks);

    const wantedIds = new Set(layers.map((layer) => layer.id));
    // Remove trails that are no longer present.
    [...rendered].forEach((id) => {
      if (!wantedIds.has(id)) removeTrail(id);
    });

    // Add/update remaining trails. Index drives the alternating colour.
    layers.forEach((layer, index) => {
      const color = colorForRoute(index, tweaks.useMultipleColors);
      renderTrail(layer, color, tweaks);
    });

    // Rebuild the global (clustered) start/end markers from the current state.
    rebuildEndpointMarkers();

    // Build/refresh shared-segment overlap layers (overlap mode only).
    applyOverlaps();

    // Apply the chosen layer-stacking mode (ordering + hover/tap handlers).
    applyLayerMode();
  };

  /**
   * On zoom: re-evaluate the effective interval/opacity and update the km layers.
   * The marker data is only recomputed when the interval actually changes; the
   * (cheap) opacity fade is applied on every zoom frame.
   */
  const onZoom = () => {
    const prevInterval = effInterval;
    refreshEffective();
    const intervalChanged = prevInterval !== effInterval;

    rendered.forEach((id) => {
      if (intervalChanged) {
        const layer = get(fileDataLayers).find((l) => l.id === id);
        if (layer) {
          (map.getSource(kmSourceId(id)) as GeoJSONSource | undefined)?.setData(
            kmMarkersFor(layer.geoJson)
          );
        }
      }
      if (map.getLayer(kmCircleId(id))) {
        map.setPaintProperty(kmCircleId(id), 'circle-opacity', kmOpacity());
        map.setPaintProperty(kmCircleId(id), 'circle-stroke-opacity', kmOpacity());
      }
      if (map.getLayer(kmLabelId(id))) {
        map.setPaintProperty(kmLabelId(id), 'text-opacity', kmOpacity());
      }
    });

    // Shrink/fade the start/end markers based on zoom.
    applyEndpointStyle();
  };

  map.on('zoom', onZoom);

  const unsubscribeLayers = fileDataLayers.subscribe(sync);
  const unsubscribeTweaks = routeTweaks.subscribe(sync);

  onDestroy(() => {
    unsubscribeLayers();
    unsubscribeTweaks();
    map.off('zoom', onZoom);
    clearLineEvents();
    // Guard against the map having been torn down already (e.g. on navigation away).
    try {
      endpointMarkers.forEach((marker) => marker.remove());
      endpointMarkers = [];
      removeOverlapLayers();
      [...rendered].forEach(removeTrail);
    } catch {
      // The map/style is gone; nothing left to clean up.
    }
  });
</script>

<style>
  /* The inline css classes get overwritten/cleared by mapbox I think */
  :global(.mapboxgl-marker.trail-endpoint) {
    display: flex;
  }
</style>

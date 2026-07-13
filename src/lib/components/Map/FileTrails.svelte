<script lang="ts">
  import type { ContextType } from './Map.svelte';
  import type { ExpressionSpecification, GeoJSONSource, Marker } from 'mapbox-gl';
  import mapboxgl from 'mapbox-gl';
  import { fileDataLayers } from '$lib/stores/file';
  import { getContext, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { bbox } from '@turf/bbox';
  import key from './mapbox-context.js';
  import { ZOOM_LEVELS } from '$lib/constants';
  import type { FileDataLayer } from '$lib/types/DataLayer';
  import type { FeatureCollection, LineString } from 'geojson';
  import {
    clusterEndpoints,
    colorForRoute,
    computeEndpointStyle,
    computeKmMarkers,
    computeNonOverlapLinesByRoute,
    computeOverlapSegments,
    computeStartEnd,
    type RouteEndpoint
  } from '$lib/util/map/routeStyle';
  import * as Sentry from '@sentry/sveltekit';
  import logger from '$lib/util/logger';

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  // Km markers are generated once at 1 km spacing (see computeKmMarkers) and tagged with
  // `everyN` (the coarsest interval they belong to: 10, 5 or 1). This zoom-driven opacity
  // expression then reveals every 10th / 5th / 1st marker as the map zooms in, and hides
  // them all below zoom 8 — without ever re-uploading the marker data. `circle-opacity` /
  // `text-opacity` are paint properties, so this is re-evaluated on every (even fractional)
  // zoom change and snaps at the thresholds.
  const KM_VISIBILITY: ExpressionSpecification = [
    'step',
    ['zoom'],
    0,
    8,
    ['case', ['>=', ['get', 'everyN'], 10], 1, 0],
    9.5,
    ['case', ['>=', ['get', 'everyN'], 5], 1, 0],
    11.5,
    1
  ];

  // Km marker background is fully white so the underlying map never shows through.
  const KM_BACKGROUND = 'rgba(255, 255, 255, 1)';

  // Route lines are drawn semi-transparently once the map is zoomed in far enough to look
  // at the route in detail (so the underlying road stays visible); fully opaque below that.
  const ROUTE_OPACITY = 0.8;
  const ROUTE_OPACITY_TRANSPARENT = 0.45;
  const OVERLAP_OPACITY = 0.9;
  const OVERLAP_OPACITY_TRANSPARENT = 0.5;
  const TRANSPARENT_MIN_ZOOM = ZOOM_LEVELS.ROAD; // "looking at the route in detail"
  const routesTransparentNow = () => map.getZoom() >= TRANSPARENT_MIN_ZOOM;
  const lineOpacity = () => (routesTransparentNow() ? ROUTE_OPACITY_TRANSPARENT : ROUTE_OPACITY);
  const overlapOpacity = () =>
    routesTransparentNow() ? OVERLAP_OPACITY_TRANSPARENT : OVERLAP_OPACITY;

  // Layer/source id helpers (the base `id` stays the line layer/source, for backwards compat).
  const kmSourceId = (id: string) => `${id}__km`;
  const kmCircleId = (id: string) => `${id}__km-circle`;
  const kmLabelId = (id: string) => `${id}__km-label`;
  const nameLabelId = (id: string) => `${id}__name`;
  const nameSourceId = (id: string) => `${id}__name-src`;

  // Per-route geometry used for the name labels: the stretches where a route does NOT run
  // alongside another route, so file names are not shown along overlapping stretches.
  // Empty (or missing id) => fall back to the route's full geometry (no clipping needed).
  let nameLinesByRoute = new Map<string, FeatureCollection<LineString>>();

  // Km label text: slightly smaller for labels with more than 2 digits (> 99) so the
  // number still fits inside the marker.
  const KM_LABEL_SIZE = 10;
  const KM_LABEL_SIZE_SMALL = 8;
  const KM_TEXT_SIZE: ExpressionSpecification = [
    'case',
    ['>', ['to-number', ['get', 'label']], 99],
    KM_LABEL_SIZE_SMALL,
    KM_LABEL_SIZE
  ];

  /** The label shown along a route: the file name minus its extension. */
  const routeNameFor = (layer: FileDataLayer) =>
    (layer.originalFileName ?? '').replace(/\.[^./\\]+$/, '');

  // --- Route name labels ---
  // Names are placed alongside each route's non-overlapping stretches: repeated along the
  // route (`line`, so they follow the curvature) but offset to the side with some spacing,
  // a slightly larger font and a slightly bigger white outline for readability.
  const NAME_SPACING = 250;
  const NAME_HALO_WIDTH = 2.5;
  // Triple the gap between repeated names once zoomed in past ~15, so they don't repeat
  // too densely when looking at the route up close.
  const NAME_SPACING_EXPR: ExpressionSpecification = [
    'step',
    ['zoom'],
    NAME_SPACING,
    14,
    NAME_SPACING * 3
  ];
  // Name font grows with zoom: 9px at zoom 6 (and below), 15px at zoom 12 (and above),
  // linearly interpolated in between.
  const NAME_TEXT_SIZE: ExpressionSpecification = [
    'interpolate',
    ['linear'],
    ['zoom'],
    6,
    9,
    12,
    15
  ];
  // Perpendicular (screen-space) offset lifting the name off the line.
  const NAME_OFFSET: [number, number] = [0, -1.3];
  const NAME_MAX_ANGLE = 60;

  // Track rendered trail layers + the global set of endpoint DOM markers.
  const rendered = new Set<string>();
  let endpointMarkers: Marker[] = [];

  // Endpoint badges are plain circles sized to the km markers (2 * their circle-radius).
  const MARKER_DIAMETER = 18;
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

  // Start = green circle, end = red circle, merged start+end = vertically split circle
  // (red on the left half, green on the right half); all with a thin white border.
  const createEndpointElement = (type: RouteEndpoint['type']) => {
    const el = document.createElement('div');
    // `display:flex` lives in the global .trail-endpoint rule below, because mapbox
    // clears the inline `display` property it sets on marker elements.
    el.classList.add('trail-endpoint');
    el.style.cssText =
      `width:${MARKER_DIAMETER}px;height:${MARKER_DIAMETER}px;border-radius:50%;` +
      'align-items:center;justify-content:center;line-height:0;overflow:hidden;' +
      'border:2px solid #fff;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,0.4);';
    if (type === 'start') el.style.background = BADGE_GREEN;
    else if (type === 'end') el.style.background = BADGE_RED;
    else
      el.style.background = `linear-gradient(90deg, ${BADGE_RED} 0 50%, ${BADGE_GREEN} 50% 100%)`;
    return el;
  };

  /** Applies the current zoom-based scale & opacity to all endpoint markers. */
  const applyEndpointStyle = () => {
    const { scale, opacity } = computeEndpointStyle(map.getZoom());
    const size = MARKER_DIAMETER * scale;
    for (const marker of endpointMarkers) {
      const el = marker.getElement();
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderWidth = `${Math.max(1, 2 * scale)}px`;
      el.style.opacity = `${opacity}`;
    }
  };

  /**
   * Rebuilds the global set of start/end markers from all *visible* trails, merging
   * endpoints within 5 m of each other into a single midpoint marker.
   */
  const rebuildEndpointMarkers = () => {
    endpointMarkers.forEach((marker) => marker.remove());
    endpointMarkers = [];

    const endpoints: RouteEndpoint[] = [];
    for (const layer of get(fileDataLayers)) {
      if (layer.visible === false) continue;
      const ends = computeStartEnd(layer.geoJson);
      if (!ends) continue;
      endpoints.push({ type: 'start', lngLat: ends.start as [number, number] });
      endpoints.push({ type: 'end', lngLat: ends.end as [number, number] });
    }

    for (const ep of clusterEndpoints(endpoints)) {
      const marker = new mapboxgl.Marker({ element: createEndpointElement(ep.type) })
        .setLngLat(ep.lngLat)
        .addTo(map);
      endpointMarkers.push(marker);
    }

    applyEndpointStyle();
  };

  const applyVisibility = (layer: FileDataLayer) => {
    const lineVisible = layer.visible !== false;
    setLayerVisibility(layer.id, lineVisible);
    setLayerVisibility(kmCircleId(layer.id), lineVisible);
    setLayerVisibility(kmLabelId(layer.id), lineVisible);
    setLayerVisibility(nameLabelId(layer.id), lineVisible);
  };

  const renderTrail = (layer: FileDataLayer, color: string) => {
    const { id, geoJson } = layer;
    const isNew = !map.getSource(id);

    // --- Route line ---

    // Add or update source data depending
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
    // Generated once at 1 km spacing; the current zoom's subset is revealed by KM_VISIBILITY.
    const kmData = computeKmMarkers(geoJson);
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
          'circle-color': KM_BACKGROUND,
          'circle-radius': 9,
          'circle-opacity': KM_VISIBILITY,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': color,
          'circle-stroke-opacity': KM_VISIBILITY
        }
      });
    } else {
      map.setPaintProperty(kmCircleId(id), 'circle-stroke-color', color);
    }

    if (!map.getLayer(kmLabelId(id))) {
      map.addLayer({
        id: kmLabelId(id),
        type: 'symbol',
        source: kmSourceId(id),
        layout: {
          'text-field': ['get', 'label'],
          'text-size': KM_TEXT_SIZE,
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: { 'text-color': color, 'text-opacity': KM_VISIBILITY }
      });
    } else {
      map.setPaintProperty(kmLabelId(id), 'text-color', color);
    }

    // --- Route name label (on the route's non-overlapping stretches only) ---
    const routeName = routeNameFor(layer);
    const nameData = nameLinesByRoute.get(id) ?? geoJson;
    if (!map.getSource(nameSourceId(id))) {
      map.addSource(nameSourceId(id), { type: 'geojson', data: nameData });
    } else {
      (map.getSource(nameSourceId(id)) as GeoJSONSource | undefined)?.setData(nameData);
    }

    if (!map.getLayer(nameLabelId(id))) {
      map.addLayer({
        id: nameLabelId(id),
        type: 'symbol',
        source: nameSourceId(id),
        layout: {
          'symbol-placement': 'line',
          'symbol-spacing': NAME_SPACING_EXPR,
          'text-field': routeName,
          'text-size': NAME_TEXT_SIZE,
          'text-offset': NAME_OFFSET,
          'text-max-angle': NAME_MAX_ANGLE,
          'text-keep-upright': true,
          // Keep the name reliably visible along the route's (non-overlapping) stretches
          // rather than letting collision with base-map labels drop it.
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': color,
          'text-halo-color': 'rgba(255, 255, 255, 0.9)',
          'text-halo-width': NAME_HALO_WIDTH
        }
      });
    } else {
      map.setLayoutProperty(nameLabelId(id), 'text-field', routeName);
      map.setPaintProperty(nameLabelId(id), 'text-color', color);
    }

    // Start/end markers are managed globally (see rebuildEndpointMarkers).

    applyVisibility(layer);
    rendered.add(id);
  };

  const removeTrail = (id: string) => {
    [nameLabelId(id), kmLabelId(id), kmCircleId(id), id].forEach((layerId) => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    });
    if (map.getSource(nameSourceId(id))) map.removeSource(nameSourceId(id));
    if (map.getSource(kmSourceId(id))) map.removeSource(kmSourceId(id));
    if (map.getSource(id)) map.removeSource(id);

    rendered.delete(id);
  };

  // The WTMG garden layers (see GardenLayer.svelte), in the order they are added — i.e.
  // bottom-to-top in the style. Uploaded route layers are always kept below these so the
  // garden icons stay visible on top of the routes.
  const GARDEN_LAYER_IDS = [
    'clusters',
    'cluster-count',
    'unclustered-point',
    'saved-gardens-layer'
  ];

  /**
   * The id of the lowest-stacked garden layer currently present, used as the `beforeId`
   * when raising route layers so they never end up on top of the garden icons.
   */
  const gardenFloorLayerId = () => GARDEN_LAYER_IDS.find((id) => map.getLayer(id));

  // Raise a layer as high as possible while staying below the garden layers.
  const moveToTop = (layerId: string) => {
    if (map.getLayer(layerId)) map.moveLayer(layerId, gardenFloorLayerId());
  };

  // Shared-segment overlap layers.
  const OVERLAP_SOURCE = '__route-overlaps';
  const OVERLAP_LAYER_A = '__route-overlaps-a';
  const OVERLAP_LAYER_B = '__route-overlaps-b';

  // Signature of the inputs the last overlap computation was based on, so the (expensive)
  // scan is skipped when nothing relevant changed.
  let lastOverlapSig = '';

  const removeOverlapLayers = () => {
    [OVERLAP_LAYER_B, OVERLAP_LAYER_A].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(OVERLAP_SOURCE)) map.removeSource(OVERLAP_SOURCE);
    lastOverlapSig = '';
  };

  /**
   * Detects where routes share the same path and draws those stretches as a single line
   * alternating the two routes' colours (solid colour A + dashed colour B on top).
   */
  const applyOverlaps = () => {
    // Keep the overlap-line opacity in sync with the current zoom (transparent when
    // zoomed in). Done before the signature short-circuit below.
    if (map.getLayer(OVERLAP_LAYER_A)) {
      map.setPaintProperty(OVERLAP_LAYER_A, 'line-opacity', overlapOpacity());
    }
    if (map.getLayer(OVERLAP_LAYER_B)) {
      map.setPaintProperty(OVERLAP_LAYER_B, 'line-opacity', overlapOpacity());
    }

    const routes = get(fileDataLayers)
      .map((layer, index) => ({
        id: layer.id,
        color: colorForRoute(index),
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

  const currentTrailIds = () =>
    get(fileDataLayers)
      .map((layer) => layer.id)
      .filter((id) => map.getLayer(id));

  /**
   * Stacks the layers: route lines at the bottom, then the overlap lines, then all km
   * markers and route names on top (kept below the garden layers). This keeps the km
   * markers & names readable wherever routes overlap.
   */
  const applyLayerOrder = () => {
    const ids = currentTrailIds();
    ids.forEach((id) => moveToTop(id));
    moveToTop(OVERLAP_LAYER_A);
    moveToTop(OVERLAP_LAYER_B);
    ids.forEach((id) => moveToTop(nameLabelId(id)));
    ids.forEach((id) => moveToTop(kmCircleId(id)));
    ids.forEach((id) => moveToTop(kmLabelId(id)));
  };

  // Signature of the visible routes the name-line clipping was last computed for, so the
  // (expensive) scan is skipped when unrelated tweaks change.
  let lastNameSig = '';

  /**
   * Recomputes, per route, the non-overlapping stretches used for the name labels — only
   * when there is more than one visible route (otherwise no overlap is possible and the
   * full route geometry is used).
   */
  const refreshNameLines = (layers: FileDataLayer[]) => {
    const visible = layers.filter((layer) => layer.visible !== false);
    const sig = visible.length >= 2 ? visible.map((layer) => layer.id).join(',') : '';
    if (sig === lastNameSig) return;
    lastNameSig = sig;
    nameLinesByRoute = sig
      ? computeNonOverlapLinesByRoute(
          visible.map((layer) => ({ id: layer.id, geoJson: layer.geoJson }))
        )
      : new Map();
  };

  /** Full reconcile of the map against the current trails + tweaks state. */
  const sync = () => {
    const layers = get(fileDataLayers);

    const wantedIds = new Set(layers.map((layer) => layer.id));
    // Remove trails that are no longer present.
    [...rendered].forEach((id) => {
      if (!wantedIds.has(id)) removeTrail(id);
    });

    // Clip name-label geometry to non-overlapping stretches before (re)rendering trails.
    refreshNameLines(layers);

    // Add/update remaining trails. Index (upload order) drives the alternating colour.
    layers.forEach((layer, index) => renderTrail(layer, colorForRoute(index)));

    // Rebuild the global (clustered) start/end markers from the current state.
    rebuildEndpointMarkers();

    // Build/refresh shared-segment overlap layers, then stack everything.
    applyOverlaps();
    applyLayerOrder();
  };

  /**
   * On zoom: update the zoom-dependent route-line transparency and the endpoint marker size.
   * (Km markers reveal themselves via the KM_VISIBILITY paint expression, so they need no
   * per-zoom handling here.)
   */
  const onZoom = () => {
    // Route-line transparency depends on the zoom level.
    rendered.forEach((id) => {
      if (map.getLayer(id)) map.setPaintProperty(id, 'line-opacity', lineOpacity());
    });

    if (map.getLayer(OVERLAP_LAYER_A)) {
      map.setPaintProperty(OVERLAP_LAYER_A, 'line-opacity', overlapOpacity());
    }
    if (map.getLayer(OVERLAP_LAYER_B)) {
      map.setPaintProperty(OVERLAP_LAYER_B, 'line-opacity', overlapOpacity());
    }

    // Shrink/fade the start/end markers based on zoom.
    applyEndpointStyle();
  };

  map.on('zoom', onZoom);

  const unsubscribeLayers = fileDataLayers.subscribe(sync);

  onDestroy(() => {
    unsubscribeLayers();
    map.off('zoom', onZoom);
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
  /* Mapbox clears the inline `display` it sets on marker elements, so the endpoint
     markers get their `display: flex` from here instead (see createEndpointElement). */
  :global(.mapboxgl-marker.trail-endpoint) {
    display: flex;
  }
</style>

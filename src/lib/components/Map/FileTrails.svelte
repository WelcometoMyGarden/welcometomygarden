<script lang="ts">
  import type { ContextType } from './Map.svelte';
  import type { ExpressionSpecification, GeoJSONSource, Marker } from 'mapbox-gl';
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
  import type { FeatureCollection, LineString, Point } from 'geojson';
  import {
    clusterEndpoints,
    colorForRoute,
    computeEndpointStyle,
    computeKmMarkers,
    computeNonOverlapLinesByRoute,
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

  // Effective km marker opacity: markers snap between fully visible and hidden at their
  // zoom thresholds.
  const kmOpacity = () => (effOpacity > 0 ? 1 : 0);

  // Km marker circle background: slightly transparent by default so the map subtly shows
  // through, or fully white when the "white km marker background" tweak is on.
  const KM_BACKGROUND = 'rgba(255, 255, 255, 0.75)';
  const KM_BACKGROUND_WHITE = 'rgba(255, 255, 255, 1)';
  const kmBackground = () =>
    get(routeTweaks).whiteKmBackground ? KM_BACKGROUND_WHITE : KM_BACKGROUND;

  // Route line opacity: reduced when the "transparent routes" tweak is on, so the
  // underlying road stays visible through the line. When "only when zoomed in" is also
  // on, the transparency only kicks in once the map is zoomed past this level.
  const ROUTE_OPACITY = 0.8;
  const ROUTE_OPACITY_TRANSPARENT = 0.45;
  const OVERLAP_OPACITY = 0.9;
  const OVERLAP_OPACITY_TRANSPARENT = 0.5;
  const TRANSPARENT_MIN_ZOOM = ZOOM_LEVELS.ROAD; // "looking at the route in detail"
  const routesTransparentNow = () => {
    const tweaks = get(routeTweaks);
    if (!tweaks.transparentRoutes) return false;
    if (tweaks.transparentRoutesHighZoomOnly) return map.getZoom() >= TRANSPARENT_MIN_ZOOM;
    return true;
  };
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

  // --- Km label text size ---
  // Slightly smaller text for labels with more than 2 digits (> 99) when the "shrink
  // labels over 99" tweak is on, so the number still fits inside the marker.
  const KM_LABEL_SIZE = 10;
  const KM_LABEL_SIZE_SMALL = 8;
  const kmTextSize = (): ExpressionSpecification | number =>
    get(routeTweaks).shrinkLargeKmLabels
      ? ['case', ['>', ['to-number', ['get', 'label']], 99], KM_LABEL_SIZE_SMALL, KM_LABEL_SIZE]
      : KM_LABEL_SIZE;

  // --- Oval km markers ---
  // When the "oval km markers" tweak is on, the km label symbol layer draws a white,
  // route-coloured-bordered pill behind the number, stretched horizontally to fit it
  // (via icon-text-fit) so wider (3-digit) numbers get a more oval marker. The pill is a
  // small circular image per (colour + background) combination, registered on demand.
  const OVAL_IMG_D = 48; // source image diameter (px); icon-text-fit stretches it to the text
  const OVAL_TEXT_FIT_PADDING: [number, number, number, number] = [3, 7, 3, 7];
  const ovalImageId = (color: string, white: boolean) => `km-oval__${white ? 'w' : 't'}__${color}`;

  /** Registers (once) and returns the id of the pill image for a colour + background. */
  const ensureOvalImage = (color: string, white: boolean): string => {
    const id = ovalImageId(color, white);
    if (map.hasImage(id)) return id;
    const size = OVAL_IMG_D;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return id;
    const stroke = 3;
    const r = size / 2 - stroke;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.fillStyle = white ? KM_BACKGROUND_WHITE : KM_BACKGROUND;
    ctx.fill();
    ctx.lineWidth = stroke;
    ctx.strokeStyle = color;
    ctx.stroke();
    if (!map.hasImage(id)) map.addImage(id, ctx.getImageData(0, 0, size, size), { pixelRatio: 2 });
    return id;
  };

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
      // Green circle (start), red circle (end) and a vertically split circle for merged
      // start+end points: red on the left half, green on the right half.
      if (type === 'start') el.style.background = BADGE_GREEN;
      else if (type === 'end') el.style.background = BADGE_RED;
      else
        el.style.background = `linear-gradient(90deg, ${BADGE_RED} 0 50%, ${BADGE_GREEN} 50% 100%)`;
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
    // In oval mode the pill background is drawn as the label's icon, so the separate
    // circle layer stays hidden to avoid a circle showing behind the oval.
    setLayerVisibility(kmCircleId(layer.id), kmVisible && !tweaks.ovalKmMarkers);
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
          'circle-color': kmBackground(),
          'circle-radius': 9,
          'circle-opacity': kmOpacity(),
          'circle-stroke-width': 1.5,
          'circle-stroke-color': color,
          'circle-stroke-opacity': kmOpacity()
        }
      });
    } else {
      map.setPaintProperty(kmCircleId(id), 'circle-color', kmBackground());
      map.setPaintProperty(kmCircleId(id), 'circle-stroke-color', color);
      map.setPaintProperty(kmCircleId(id), 'circle-opacity', kmOpacity());
      map.setPaintProperty(kmCircleId(id), 'circle-stroke-opacity', kmOpacity());
    }

    const oval = tweaks.ovalKmMarkers;
    // The oval pill (drawn as the label's icon) carries the white background + coloured
    // border itself, so the separate circle layer is hidden in oval mode (see
    // applyVisibility). Register the pill image for this route's colour on demand.
    const ovalImg = oval ? ensureOvalImage(color, tweaks.whiteKmBackground) : '';

    if (!map.getLayer(kmLabelId(id))) {
      map.addLayer({
        id: kmLabelId(id),
        type: 'symbol',
        source: kmSourceId(id),
        layout: {
          'text-field': ['get', 'label'],
          'text-size': kmTextSize(),
          'text-allow-overlap': true,
          'text-ignore-placement': true,
          'icon-image': ovalImg,
          'icon-text-fit': 'both',
          'icon-text-fit-padding': OVAL_TEXT_FIT_PADDING,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        },
        paint: { 'text-color': color, 'text-opacity': kmOpacity(), 'icon-opacity': kmOpacity() }
      });
    } else {
      map.setLayoutProperty(kmLabelId(id), 'text-size', kmTextSize());
      map.setLayoutProperty(kmLabelId(id), 'icon-image', ovalImg);
      map.setPaintProperty(kmLabelId(id), 'text-color', color);
      map.setPaintProperty(kmLabelId(id), 'text-opacity', kmOpacity());
      map.setPaintProperty(kmLabelId(id), 'icon-opacity', kmOpacity());
    }

    // --- Route name label (repeated along the line, but not along overlapping stretches) ---
    const routeName = routeNameFor(layer);
    // Names are placed on the route's non-overlapping stretches only; when there is no
    // clipping to do we fall back to the route's full geometry.
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
          'symbol-spacing': 250,
          'text-field': routeName,
          'text-size': 13,
          'text-max-angle': 40,
          'text-keep-upright': true,
          // Keep the name reliably visible along the route's (non-overlapping) stretches
          // rather than letting collision with base-map labels drop it. Overlapping
          // stretches are already excluded from this layer's source geometry.
          'text-allow-overlap': true,
          'text-ignore-placement': true
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
   * when raising route layers so they never end up on top of the garden icons. Returns
   * `undefined` when no garden layer exists yet (e.g. still loading), in which case
   * layers are raised to the very top as a fallback.
   */
  const gardenFloorLayerId = () => GARDEN_LAYER_IDS.find((id) => map.getLayer(id));

  // Raise a layer as high as possible while staying below the garden layers.
  const moveToTop = (layerId: string) => {
    if (map.getLayer(layerId)) map.moveLayer(layerId, gardenFloorLayerId());
  };

  /** Brings a trail's line and km marker layers above the other routes (but below gardens). */
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

  /** Moves the overlap lines and all km marker layers above the routes (below gardens). */
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

  // Signature of the visible routes the name-line clipping was last computed for, so the
  // (expensive) scan is skipped when unrelated tweaks change.
  let lastNameSig = '';

  /**
   * Recomputes, per route, the non-overlapping stretches used for the name labels — only
   * when route names are shown and there is more than one visible route (otherwise no
   * overlap is possible and the full route geometry is used).
   */
  const refreshNameLines = (layers: FileDataLayer[], tweaks: RouteTweaks) => {
    const visible = tweaks.showRouteNames ? layers.filter((layer) => layer.visible !== false) : [];
    const sig = visible.length >= 2 ? visible.map((layer) => layer.id).join(',') : '';
    if (sig === lastNameSig) return;
    lastNameSig = sig;
    nameLinesByRoute = sig
      ? computeNonOverlapLinesByRoute(visible.map((layer) => ({ id: layer.id, geoJson: layer.geoJson })))
      : new Map();
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

    // Clip name-label geometry to non-overlapping stretches before (re)rendering trails.
    refreshNameLines(layers, tweaks);

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
        map.setPaintProperty(kmLabelId(id), 'icon-opacity', kmOpacity());
      }
    });

    // Keep the route-line transparency in sync with the zoom level when the "only when
    // zoomed in" tweak is on (it's the only case where line opacity changes with zoom).
    if (get(routeTweaks).transparentRoutes && get(routeTweaks).transparentRoutesHighZoomOnly) {
      rendered.forEach((id) => {
        if (map.getLayer(id)) map.setPaintProperty(id, 'line-opacity', lineOpacity());
      });
      if (map.getLayer(OVERLAP_LAYER_A)) {
        map.setPaintProperty(OVERLAP_LAYER_A, 'line-opacity', overlapOpacity());
      }
      if (map.getLayer(OVERLAP_LAYER_B)) {
        map.setPaintProperty(OVERLAP_LAYER_B, 'line-opacity', overlapOpacity());
      }
    }

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

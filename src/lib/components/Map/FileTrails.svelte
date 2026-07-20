<script lang="ts">
  import type { ContextType } from './Map.svelte';
  import type { ExpressionSpecification, GeoJSONSource } from 'mapbox-gl';
  import { fileDataLayers } from '$lib/stores/file';
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
    computeKmMarkers,
    computeStartEnd,
    type RouteEndpoint
  } from '$lib/util/map/util';
  import { ENDPOINT_ICONS, ensureEndpointIcons } from './endpointIcon';
  import { ensureKmCircleIcon } from './kmCircleIcon';
  import * as Sentry from '@sentry/sveltekit';
  import logger from '$lib/util/logger';
  import { dev } from '$app/environment';

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  // Km markers are generated once at 1 km spacing (see computeKmMarkers) and tagged with
  // `everyN` (the coarsest interval they belong to: 10, 5 or 1). A single symbol layer per
  // route draws both the white circle (as its `icon-image`) and the km number (as its
  // `text-field`); a zoom-driven `step` expression on each reveals every 10th / 5th / 1st
  // marker as the map zooms in and hides them all below zoom 8, without ever re-uploading the
  // marker data.
  //
  // Because the circle and number share one symbol, Mapbox's native symbol fade
  // (the map's `fadeDuration`) fades them in and out *together* when they cross a reveal
  // threshold.
  const KM_ZOOM_10 = 8; // every 10th km marker appears here
  const KM_ZOOM_5 = 10; // every 5th (and 10th) from here
  const KM_ZOOM_1 = 12; // every km from here

  // Builds the shared reveal schedule: `shown` for markers that belong at the current zoom,
  // `hidden` for the rest. Used for both the circle icon (`shown` = its image id) and the
  // number text (`shown` = the label), so the two always appear/disappear on the same zoom.
  const kmReveal = (
    shown: string | ExpressionSpecification,
    hidden: string
  ): ExpressionSpecification =>
    [
      'step',
      ['zoom'],
      hidden,
      KM_ZOOM_10,
      ['case', ['>=', ['get', 'everyN'], 10], shown, hidden],
      KM_ZOOM_5,
      ['case', ['>=', ['get', 'everyN'], 5], shown, hidden],
      KM_ZOOM_1,
      shown
    ] as ExpressionSpecification;

  // Route lines are drawn semi-transparently once the map is zoomed in far enough to look at
  // the route in detail (>= road zoom) so the underlying street stays visible; fully opaque
  // below that.
  const lineOpacity = () => (map.getZoom() >= ZOOM_LEVELS.ROAD ? 0.45 : 0.8);

  // Layer/source id helpers. The base `id` is the line layer/source.
  const kmSourceId = (id: string) => `${id}__km`;
  const kmLabelId = (id: string) => `${id}__km-label`;
  const nameLabelId = (id: string) => `${id}__name`;

  // Per-trail record of what we last drew, so a store change can be diffed down to the
  // minimal map work: only re-render a trail whose geometry actually changed, only recolour
  // one whose palette slot shifted, and — the common case — only flip layer `visibility` when
  // a route is toggled in the sidebar (no km-marker recompute, no source rewrite).
  type RenderedTrail = {
    geoJson: FileDataLayer['geoJson'];
    visible: boolean;
    color: string;
  };
  const rendered = new Map<string, RenderedTrail>();

  // --- Start/end badges ---
  // Drawn as a single symbol layer (one feature per clustered endpoint) so their
  // visibility can be driven by the same kind of zoom step expression as the km markers.
  // The badge icons themselves live in ./endpointIcon.
  const ENDPOINT_SOURCE = '__route-endpoints';
  const ENDPOINT_LAYER = '__route-endpoints-layer';

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

  /** Removes the endpoint layer and its source. */
  const removeEndpointLayer = () => {
    if (map.getLayer(ENDPOINT_LAYER)) map.removeLayer(ENDPOINT_LAYER);
    if (map.getSource(ENDPOINT_SOURCE)) map.removeSource(ENDPOINT_SOURCE);
  };

  /**
   * Rebuilds the endpoint layer from all *visible* trails, merging endpoints within 5 m
   * of each other into a single badge (see clusterEndpoints).
   */
  const rebuildEndpoints = () => {
    const endpoints: RouteEndpoint[] = [];
    for (const layer of get(fileDataLayers)) {
      if (layer.visible === false) continue;
      const ends = computeStartEnd(layer.geoJson);
      if (!ends) continue;
      endpoints.push({ type: 'start', lngLat: ends.start as [number, number] });
      endpoints.push({ type: 'end', lngLat: ends.end as [number, number] });
    }

    const data: FeatureCollection<Point, { type: RouteEndpoint['type'] }> = {
      type: 'FeatureCollection',
      features: clusterEndpoints(endpoints).map((ep) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: ep.lngLat },
        properties: { type: ep.type }
      }))
    };

    if (!map.getSource(ENDPOINT_SOURCE)) {
      map.addSource(ENDPOINT_SOURCE, { type: 'geojson', data });
    } else {
      (map.getSource(ENDPOINT_SOURCE) as GeoJSONSource | undefined)?.setData(data);
    }

    if (!map.getLayer(ENDPOINT_LAYER)) {
      ensureEndpointIcons(map);
      map.addLayer({
        id: ENDPOINT_LAYER,
        type: 'symbol',
        source: ENDPOINT_SOURCE,
        layout: {
          // Green = start, red = end, split red|green = a merged start+end ("pause").
          'icon-image': [
            'match',
            ['get', 'type'],
            'start',
            ENDPOINT_ICONS.start,
            'end',
            ENDPOINT_ICONS.end,
            ENDPOINT_ICONS.pause
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        },
        // Badges appear together with the km markers (from zoom 8) at a fixed size — no
        // fading or resizing. `icon-opacity` is a paint property, so this snaps at the
        // threshold.
        paint: { 'icon-opacity': ['step', ['zoom'], 0, 8, 1] }
      });
    }
  };

  const applyVisibility = (layer: FileDataLayer) => {
    const lineVisible = layer.visible !== false;
    setLayerVisibility(layer.id, lineVisible);
    setLayerVisibility(kmLabelId(layer.id), lineVisible);
    setLayerVisibility(nameLabelId(layer.id), lineVisible);
  };

  /**
   * Recolours a trail's layers in place (paint/icon only). Used when a trail's palette slot
   * shifts because another trail was added/removed — no need to recompute km markers or
   * rewrite any source data. The km circle is an image, so recolouring it swaps the layer's
   * `icon-image` to the matching-colour circle (registered on demand).
   */
  const applyColor = (id: string, color: string) => {
    if (map.getLayer(id)) map.setPaintProperty(id, 'line-color', color);
    if (map.getLayer(kmLabelId(id))) {
      const iconId = ensureKmCircleIcon(map, color);
      map.setLayoutProperty(kmLabelId(id), 'icon-image', kmReveal(iconId, ''));
      map.setPaintProperty(kmLabelId(id), 'text-color', color);
    }
    if (map.getLayer(nameLabelId(id))) map.setPaintProperty(nameLabelId(id), 'text-color', color);
  };

  // Dev-only micro-benchmark: runs `work` and, on the dev server only, logs how long it took
  // via the Performance API (performance.now()). Outside `yarn dev` it just runs the work,
  // with no measuring/logging overhead. Returns whatever `work` returns.
  function benchmark<T>(label: string, work: () => T): T {
    if (!dev) return work();
    const start = performance.now();
    try {
      return work();
    } finally {
      logger.info(`⏱ [FileTrails] ${label}: ${(performance.now() - start).toFixed(2)} ms`);
    }
  }

  const renderTrail = (layer: FileDataLayer, color: string) => {
    const { id, geoJson } = layer;
    const isNew = !map.getSource(id);
    // Short identifier for the dev benchmark logs below.
    const benchName = layer.originalFileName ?? id;

    // --- Route line ---
    // Import (add the GeoJSON source) & render (add the line layer) the basic route line.
    benchmark(`${isNew ? 'import + render' : 'update'} line · ${benchName}`, () => {
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
    });

    // Zoom to the trail only when we just added it locally.
    if (isNew && layer.animate) fitToTrail(geoJson);

    // --- Kilometre markers ---
    // Generated once at 1 km spacing; the current zoom's subset is revealed by kmReveal.
    const kmData = benchmark(`calculate km markers · ${benchName}`, () =>
      computeKmMarkers(geoJson)
    );
    benchmark(`render km markers · ${benchName}`, () => {
      if (!map.getSource(kmSourceId(id))) {
        map.addSource(kmSourceId(id), { type: 'geojson', data: kmData });
      } else {
        (map.getSource(kmSourceId(id)) as GeoJSONSource | undefined)?.setData(kmData);
      }

      // One symbol layer draws the whole marker: the white circle as its icon and the km
      // number as its text. Both are revealed by the SAME zoom `step` schedule (kmReveal), so
      // they enter/leave together — and because they're one symbol, Mapbox's native symbol
      // fade (map `fadeDuration`) fades the circle in with the number instead of popping it in.
      const iconId = ensureKmCircleIcon(map, color);
      if (!map.getLayer(kmLabelId(id))) {
        map.addLayer({
          id: kmLabelId(id),
          type: 'symbol',
          source: kmSourceId(id),
          layout: {
            // Reveal the circle image at the marker's zoom band (its id when shown, otherwise
            // '' = no icon). Always drawn (no collision) so markers never drop out.
            'icon-image': kmReveal(iconId, ''),
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            // Reveal the number on the exact same schedule (the label when shown, else '').
            'text-field': kmReveal(['get', 'label'], ''),
            // Slightly smaller for labels with more than 2 digits (> 99) so the number still
            // fits inside the marker.
            'text-size': ['case', ['>', ['to-number', ['get', 'label']], 99], 8, 10],
            'text-allow-overlap': true,
            'text-ignore-placement': true
          },
          paint: { 'text-color': color }
        });
      } else {
        map.setLayoutProperty(kmLabelId(id), 'icon-image', kmReveal(iconId, ''));
        map.setPaintProperty(kmLabelId(id), 'text-color', color);
      }
    });

    // --- Route name label (drawn along the full route) ---
    // The label is the file name minus its extension. It reuses the base line source (`id`)
    // — same geometry, no need for a second copy — and is placed along the line (so it
    // follows the curvature), repeated, offset to the side, in a zoom-scaled font.
    const routeName = (layer.originalFileName ?? '').replace(/\.[^./\\]+$/, '');
    if (!map.getLayer(nameLabelId(id))) {
      map.addLayer({
        id: nameLabelId(id),
        type: 'symbol',
        source: id,
        layout: {
          'symbol-placement': 'line',
          // Make sure the names are not repeated too often when zooming in close
          // follows value, zoom, value, zoom, ...
          'symbol-spacing': ['step', ['zoom'], 150, 14, 150 * 2, 15, 150 * 2.5],
          'text-field': routeName,
          // Font grows with zoom, starting from zoom 5
          // interpolate follows zoom, value, zoom, value
          'text-size': ['interpolate', ['linear'], ['zoom'], 9, 10, 10, 12, 12, 14, 14, 15],
          // Perpendicular (screen-space) offset lifting the name off the line.
          'text-offset': [0, -1.3],
          // Default 45
          'text-max-angle': 40,
          // The text may be flipped vertically to prevent it from being rendered upside-down.
          'text-keep-upright': true,
          // overlap among eachother
          'text-allow-overlap': false,
          // with other map symbols (including other trails)
          'text-ignore-placement': false
        },
        paint: {
          'text-color': color,
          'text-halo-color': 'rgba(255, 255, 255, 0.9)',
          'text-halo-width': 2.5
        }
      });
    } else {
      map.setLayoutProperty(nameLabelId(id), 'text-field', routeName);
      map.setPaintProperty(nameLabelId(id), 'text-color', color);
    }

    // Start/end badges are managed globally (see rebuildEndpoints).

    applyVisibility(layer);
    rendered.set(id, { geoJson, visible: layer.visible !== false, color });
  };

  const removeTrail = (id: string) => {
    [nameLabelId(id), kmLabelId(id), id].forEach((layerId) => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    });
    if (map.getSource(kmSourceId(id))) map.removeSource(kmSourceId(id));
    if (map.getSource(id)) map.removeSource(id);

    rendered.delete(id);
  };

  /**
   * The id of the lowest-stacked garden layer currently present, used as the `beforeId` when
   * raising route layers so they never end up on top of the garden icons (uploaded route
   * layers are always kept below these so the garden icons stay visible). The list is the
   * WTMG garden layers (see GardenLayer.svelte) in the order they are added — i.e.
   * bottom-to-top in the style — so `.find` returns the lowest one present.
   */
  const gardenFloorLayerId = () =>
    ['clusters', 'cluster-count', 'unclustered-point', 'saved-gardens-layer'].find((id) =>
      map.getLayer(id)
    );

  // Raise a layer as high as possible while staying below the garden layers.
  const moveToTop = (layerId: string) => {
    if (map.getLayer(layerId)) map.moveLayer(layerId, gardenFloorLayerId());
  };

  const currentTrailIds = () =>
    get(fileDataLayers)
      .map((layer) => layer.id)
      .filter((id) => map.getLayer(id));

  /**
   * Stacks the layers: route lines at the bottom (oldest → newest, so the most recently
   * uploaded route sits on top of older ones), then all km markers, route names and
   * start/end badges above every route line (kept below the garden layers). This keeps the
   * km markers, names & badges readable wherever routes cross or overlap.
   */
  const applyLayerOrder = () => {
    // currentTrailIds() follows the store order, which is sorted oldest → newest, so moving
    // each up in turn leaves the most recently uploaded route line topmost.
    const ids = currentTrailIds();
    ids.forEach((id) => moveToTop(id));
    ids.forEach((id) => moveToTop(nameLabelId(id)));
    ids.forEach((id) => moveToTop(kmLabelId(id)));
    moveToTop(ENDPOINT_LAYER);
  };

  /**
   * Reconciles the map against the current trails. Diff-based: each trail is compared to what
   * we last drew (see `rendered`) so only what actually changed is touched —
   *  • new trail        → full render
   *  • gone trail       → remove
   *  • geometry changed → re-render that trail (recompute km markers, rewrite its sources)
   *  • palette shifted  → recolour only (add/remove reorders the colour slots)
   *  • visibility only  → flip that trail's layer `visibility` only (the sidebar toggle case)
   *
   * The two global passes only run when their inputs changed: the clustered start/end badges
   * when the set of visible trails (or a visible trail's geometry) changed, and the layer
   * restack when trails were added/removed/reordered. A plain visibility toggle triggers
   * neither a per-trail re-render nor the layer restack.
   */
  const sync = (layers: FileDataLayer[]) => {
    const wantedIds = new Set(layers.map((layer) => layer.id));

    let endpointsChanged = false; // rebuild the clustered start/end badges
    let stackChanged = false; // re-apply the layer stacking order

    // Remove trails that are no longer present.
    [...rendered.keys()].forEach((id) => {
      if (wantedIds.has(id)) return;
      const prev = rendered.get(id);
      removeTrail(id);
      stackChanged = true;
      if (prev?.visible) endpointsChanged = true;
    });

    // Add/update remaining trails. Index (upload order) drives the alternating colour.
    layers.forEach((layer, index) => {
      const color = colorForRoute(index);
      const visible = layer.visible !== false;
      const prev = rendered.get(layer.id);

      if (!prev) {
        renderTrail(layer, color);
        stackChanged = true;
        if (visible) endpointsChanged = true;
        return;
      }

      // The store only replaces `geoJson` by reference when the file data actually changed, so
      // an identity check distinguishes a real geometry update from a mere visibility flip.
      if (prev.geoJson !== layer.geoJson) {
        renderTrail(layer, color);
        // A visible trail's start/end points may have moved.
        if (visible || prev.visible) endpointsChanged = true;
        return;
      }

      // Geometry unchanged: apply only the properties that shifted.
      if (prev.color !== color) {
        applyColor(layer.id, color);
        stackChanged = true; // a colour shift means the trail order changed (add/remove)
      }
      if (prev.visible !== visible) {
        applyVisibility(layer);
        endpointsChanged = true;
      }
      rendered.set(layer.id, { geoJson: layer.geoJson, visible, color });
    });

    // Rebuild the global (clustered) start/end badges only when the visible set changed.
    if (endpointsChanged) rebuildEndpoints();

    // Re-stack (km markers & badges on top of all route lines) only when the set/order changed.
    if (stackChanged) applyLayerOrder();
  };

  /**
   * On zoom: update only the zoom-dependent route-line transparency. (Km markers and
   * start/end badges reveal themselves via their own zoom `step` expressions, so they need
   * no per-zoom handling here.)
   */
  const onZoom = () => {
    // Route-line transparency depends on the zoom level.
    rendered.forEach((_trail, id) => {
      if (map.getLayer(id)) map.setPaintProperty(id, 'line-opacity', lineOpacity());
    });
  };

  map.on('zoom', onZoom);

  // Reconcile the map whenever the trails store changes. Reading `$fileDataLayers` registers
  // it as the effect's only dependency; `sync` then diffs against what's already drawn so a
  // single-route toggle only flips that route's layer visibility.
  $effect(() => {
    sync($fileDataLayers);
  });

  onDestroy(() => {
    map.off('zoom', onZoom);
    // Guard against the map having been torn down already (e.g. on navigation away).
    try {
      removeEndpointLayer();
      [...rendered.keys()].forEach(removeTrail);
    } catch {
      // The map/style is gone; nothing left to clean up.
    }
  });
</script>

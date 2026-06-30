<script lang="ts">
  import type { ContextType } from './Map.svelte';
  import type { GeoJSONSource, Marker } from 'mapbox-gl';
  import mapboxgl from 'mapbox-gl';
  import { fileDataLayers } from '$lib/stores/file';
  import {
    routeTweaks,
    type RouteTweaks,
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
    colorForRoute,
    computeKmMarkers,
    computeStartEnd,
    evaluateZoomInterval,
    parseZoomIntervalConfig
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

  // Layer/source id helpers (the base `id` stays the line layer/source, for backwards compat).
  const kmSourceId = (id: string) => `${id}__km`;
  const kmCircleId = (id: string) => `${id}__km-circle`;
  const kmLabelId = (id: string) => `${id}__km-label`;

  // Track what we've rendered + the DOM markers we manage manually.
  const rendered = new Set<string>();
  const endpointMarkers = new Map<string, { start?: Marker; end?: Marker }>();

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

  const toggleMarker = (marker: Marker | undefined, visible: boolean) => {
    if (marker) marker.getElement().style.display = visible ? '' : 'none';
  };

  const createEndpointElement = (type: 'start' | 'end') => {
    const el = document.createElement('div');
    el.style.cssText =
      'width:24px;height:24px;border-radius:50%;display:flex;align-items:center;' +
      'justify-content:center;line-height:0;border:2px solid #fff;box-sizing:border-box;' +
      'box-shadow:0 1px 4px rgba(0,0,0,0.4);';
    // Slightly transparent backgrounds; the end marker is a red-orange.
    el.style.background = type === 'start' ? 'rgba(27, 120, 55, 0.82)' : 'rgba(216, 67, 33, 0.82)';
    el.innerHTML =
      type === 'start'
        ? // Filled play (triangle) icon
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" ' +
          'style="display:block"><path d="M8 6v12l11-6z"/></svg>'
        : // Filled stop (square) icon
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="#fff" ' +
          'style="display:block"><rect x="5" y="5" width="14" height="14" rx="1.5"/></svg>';
    return el;
  };

  const updateEndpointMarkers = (layer: FileDataLayer) => {
    const ends = computeStartEnd(layer.geoJson);
    let entry = endpointMarkers.get(layer.id);
    if (!entry) {
      entry = {};
      endpointMarkers.set(layer.id, entry);
    }

    if (!ends) {
      entry.start?.remove();
      entry.end?.remove();
      entry.start = entry.end = undefined;
      return;
    }

    const startLngLat = ends.start as [number, number];
    const endLngLat = ends.end as [number, number];

    if (!entry.start) {
      entry.start = new mapboxgl.Marker({ element: createEndpointElement('start') })
        .setLngLat(startLngLat)
        .addTo(map);
    } else {
      entry.start.setLngLat(startLngLat);
    }

    if (!entry.end) {
      entry.end = new mapboxgl.Marker({ element: createEndpointElement('end') })
        .setLngLat(endLngLat)
        .addTo(map);
    } else {
      entry.end.setLngLat(endLngLat);
    }
  };

  const applyVisibility = (layer: FileDataLayer, tweaks: RouteTweaks) => {
    const lineVisible = layer.visible !== false;
    setLayerVisibility(layer.id, lineVisible);

    const kmVisible = lineVisible && tweaks.showKmMarkers;
    setLayerVisibility(kmCircleId(layer.id), kmVisible);
    setLayerVisibility(kmLabelId(layer.id), kmVisible);

    const endpointsVisible = lineVisible && tweaks.showStartEndMarkers;
    const entry = endpointMarkers.get(layer.id);
    toggleMarker(entry?.start, endpointsVisible);
    toggleMarker(entry?.end, endpointsVisible);
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
        paint: { 'line-width': 7, 'line-color': color, 'line-opacity': 0.8 }
      });
    } else {
      map.setPaintProperty(id, 'line-color', color);
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
          'circle-opacity': effOpacity,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': color,
          'circle-stroke-opacity': effOpacity
        }
      });
    } else {
      map.setPaintProperty(kmCircleId(id), 'circle-stroke-color', color);
      map.setPaintProperty(kmCircleId(id), 'circle-opacity', effOpacity);
      map.setPaintProperty(kmCircleId(id), 'circle-stroke-opacity', effOpacity);
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
        paint: { 'text-color': color, 'text-opacity': effOpacity }
      });
    } else {
      map.setPaintProperty(kmLabelId(id), 'text-color', color);
      map.setPaintProperty(kmLabelId(id), 'text-opacity', effOpacity);
    }

    // --- Start/end markers ---
    updateEndpointMarkers(layer);

    // --- Visibility ---
    applyVisibility(layer, tweaks);

    rendered.add(id);
  };

  const removeTrail = (id: string) => {
    [kmLabelId(id), kmCircleId(id), id].forEach((layerId) => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
    });
    if (map.getSource(kmSourceId(id))) map.removeSource(kmSourceId(id));
    if (map.getSource(id)) map.removeSource(id);

    const entry = endpointMarkers.get(id);
    entry?.start?.remove();
    entry?.end?.remove();
    endpointMarkers.delete(id);

    rendered.delete(id);
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
        map.setPaintProperty(kmCircleId(id), 'circle-opacity', effOpacity);
        map.setPaintProperty(kmCircleId(id), 'circle-stroke-opacity', effOpacity);
      }
      if (map.getLayer(kmLabelId(id))) {
        map.setPaintProperty(kmLabelId(id), 'text-opacity', effOpacity);
      }
    });
  };

  map.on('zoom', onZoom);

  const unsubscribeLayers = fileDataLayers.subscribe(sync);
  const unsubscribeTweaks = routeTweaks.subscribe(sync);

  onDestroy(() => {
    unsubscribeLayers();
    unsubscribeTweaks();
    map.off('zoom', onZoom);
    // Guard against the map having been torn down already (e.g. on navigation away).
    try {
      [...rendered].forEach(removeTrail);
    } catch {
      // The map/style is gone; nothing left to clean up.
    }
  });
</script>

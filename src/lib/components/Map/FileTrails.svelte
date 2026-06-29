<script lang="ts">
  import type { ContextType } from './Map.svelte';
  import type { GeoJSONSource, Marker } from 'mapbox-gl';
  import mapboxgl from 'mapbox-gl';
  import { fileDataLayers } from '$lib/stores/file';
  import { routeTweaks, type RouteTweaks } from '$lib/stores/routeTweaks';
  import { getContext, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { bbox } from '@turf/bbox';
  import key from './mapbox-context.js';
  import { ZOOM_LEVELS } from '$lib/constants';
  import type { FileDataLayer } from '$lib/types/DataLayer';
  import { colorForRoute, computeKmMarkers, computeStartEnd } from '$lib/util/map/routeStyle';
  import * as Sentry from '@sentry/sveltekit';
  import logger from '$lib/util/logger';

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

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
      'justify-content:center;border:2px solid #fff;box-sizing:border-box;' +
      'box-shadow:0 1px 4px rgba(0,0,0,0.4);';
    el.style.background = type === 'start' ? '#1b7837' : '#c1121f';
    el.innerHTML =
      type === 'start'
        ? // Flag icon
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" ' +
          'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/></svg>'
        : // Checkered (finish) icon
          '<svg width="13" height="13" viewBox="0 0 16 16">' +
          '<rect x="0" y="0" width="8" height="8" fill="#fff"/>' +
          '<rect x="8" y="8" width="8" height="8" fill="#fff"/></svg>';
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
    const kmData = computeKmMarkers(geoJson, tweaks.kmInterval);
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
          'circle-stroke-width': 1.5,
          'circle-stroke-color': color
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
          'text-size': 10,
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: { 'text-color': color }
      });
    } else {
      map.setPaintProperty(kmLabelId(id), 'text-color', color);
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

  const unsubscribeLayers = fileDataLayers.subscribe(sync);
  const unsubscribeTweaks = routeTweaks.subscribe(sync);

  onDestroy(() => {
    unsubscribeLayers();
    unsubscribeTweaks();
    // Guard against the map having been torn down already (e.g. on navigation away).
    try {
      [...rendered].forEach(removeTrail);
    } catch {
      // The map/style is gone; nothing left to clean up.
    }
  });
</script>

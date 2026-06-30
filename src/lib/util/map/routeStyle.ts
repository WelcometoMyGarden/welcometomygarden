/**
 * Helpers for styling uploaded route (trail) files on the map.
 *
 * NOTE: part of a temporary prototype for route file display enhancements.
 */
import { along, distance, length, lineString } from '@turf/turf';
import type { Feature, FeatureCollection, Geometry, Point, Position } from 'geojson';

/**
 * Palette used to colour uploaded routes.
 *
 * The first colour is the original "dark purple" (indigo). The remaining four are
 * distinct, well-contrasting colours so that touching/overlapping routes can be told
 * apart. All are dark/saturated enough to stand out against the light green/yellow map.
 */
export const ROUTE_COLORS = [
  '#4b0082', // indigo (original dark purple)
  '#d7263d', // crimson red
  '#1565c0', // strong blue
  '#d81b60', // magenta / deep pink
  '#e65100' // deep orange
];

/** The default single colour, used when multi-colouring is toggled off. */
export const DEFAULT_ROUTE_COLOR = ROUTE_COLORS[0];

/**
 * Returns the colour for the route at the given index.
 * @param index position of the route among the uploaded routes
 * @param useMultipleColors when false, always returns the default colour
 */
export const colorForRoute = (index: number, useMultipleColors: boolean): string =>
  useMultipleColors ? ROUTE_COLORS[index % ROUTE_COLORS.length] : DEFAULT_ROUTE_COLOR;

/** Recursively collects all LineString coordinate arrays from a geometry. */
const collectLines = (geometry: Geometry, out: Position[][]) => {
  switch (geometry.type) {
    case 'LineString':
      out.push(geometry.coordinates);
      break;
    case 'MultiLineString':
      geometry.coordinates.forEach((coords) => out.push(coords));
      break;
    case 'GeometryCollection':
      geometry.geometries.forEach((g) => collectLines(g, out));
      break;
    default:
      break;
  }
};

/** Extracts all usable line segments (>= 2 points) from a GeoJSON route. */
export const extractLines = (geoJson: FeatureCollection | Feature): Position[][] => {
  const out: Position[][] = [];
  const features = geoJson.type === 'FeatureCollection' ? geoJson.features : [geoJson];
  features.forEach((feature) => {
    if (feature.geometry) collectLines(feature.geometry, out);
  });
  return out.filter((line) => line.length >= 2);
};

/**
 * Returns the first and last coordinate of a route, treating the route as the
 * concatenation of its line segments (first point of the first line, last point
 * of the last line).
 */
export const computeStartEnd = (
  geoJson: FeatureCollection | Feature
): { start: Position; end: Position } | null => {
  const lines = extractLines(geoJson);
  if (lines.length === 0) return null;
  const first = lines[0];
  const last = lines[lines.length - 1];
  return { start: first[0], end: last[last.length - 1] };
};

/**
 * Computes evenly-spaced kilometre markers along a route. Distances are accumulated
 * across consecutive line segments so labels stay continuous over multi-segment routes.
 *
 * @param intervalKm the spacing between markers, in kilometres
 */
export const computeKmMarkers = (
  geoJson: FeatureCollection | Feature,
  intervalKm: number
): FeatureCollection<Point, { label: string }> => {
  const features: Feature<Point, { label: string }>[] = [];
  const lines = extractLines(geoJson);

  if (intervalKm > 0) {
    const epsilon = 1e-9;
    let cumulative = 0; // total distance covered before the current segment
    let count = 1; // index of the next marker to place
    for (const coords of lines) {
      const ls = lineString(coords);
      const segmentLength = length(ls, { units: 'kilometers' });
      while (count * intervalKm <= cumulative + segmentLength + epsilon) {
        const distanceOnSegment = Math.max(0, count * intervalKm - cumulative);
        const point = along(ls, distanceOnSegment, { units: 'kilometers' });
        const km = count * intervalKm;
        const label = Number.isInteger(km) ? `${km}` : `${+km.toFixed(2)}`;
        features.push({
          type: 'Feature',
          geometry: point.geometry,
          properties: { label }
        });
        count++;
      }
      cumulative += segmentLength;
    }
  }

  return { type: 'FeatureCollection', features };
};

/** A start/end marker at a route extremity. */
export type RouteEndpoint = { type: 'start' | 'end'; lngLat: [number, number] };

/**
 * Merges endpoints that lie within `maxDistanceMeters` of each other into a single
 * marker placed at the cluster's midpoint (centroid). A merged cluster is always
 * rendered as a `start` marker.
 */
export const clusterEndpoints = (
  endpoints: RouteEndpoint[],
  maxDistanceMeters = 5
): RouteEndpoint[] => {
  const maxKm = maxDistanceMeters / 1000;
  const clusters: RouteEndpoint[][] = [];

  for (const ep of endpoints) {
    const cluster = clusters.find((c) =>
      c.some((m) => distance(m.lngLat, ep.lngLat, { units: 'kilometers' }) <= maxKm)
    );
    if (cluster) cluster.push(ep);
    else clusters.push([ep]);
  }

  return clusters.map((cluster) => {
    if (cluster.length === 1) return cluster[0];
    const lng = cluster.reduce((sum, m) => sum + m.lngLat[0], 0) / cluster.length;
    const lat = cluster.reduce((sum, m) => sum + m.lngLat[1], 0) / cluster.length;
    return { type: 'start', lngLat: [lng, lat] };
  });
};

/** Zoom thresholds controlling start/end marker shrinking & fading. */
export const ENDPOINT_FULL_ZOOM = 8.5; // at/above: full size
export const ENDPOINT_SHRINK_FLOOR = 7; // 7–8.5: shrink down to ENDPOINT_MIN_SCALE
export const ENDPOINT_FADE_END = 6.5; // 6.5–7: fade out; below: hidden
export const ENDPOINT_MIN_SCALE = 0.45;

/**
 * Computes the start/end marker scale & opacity for a zoom level:
 * - zoom >= 8.5: full size, opaque
 * - 7–8.5: shrinks linearly down to ENDPOINT_MIN_SCALE
 * - 6.5–7: stays small and fades out over 0.5 zoom levels
 * - below 6.5: hidden
 */
export const computeEndpointStyle = (zoom: number): { scale: number; opacity: number } => {
  if (zoom >= ENDPOINT_FULL_ZOOM) return { scale: 1, opacity: 1 };
  if (zoom >= ENDPOINT_SHRINK_FLOOR) {
    const t = (zoom - ENDPOINT_SHRINK_FLOOR) / (ENDPOINT_FULL_ZOOM - ENDPOINT_SHRINK_FLOOR);
    return { scale: ENDPOINT_MIN_SCALE + t * (1 - ENDPOINT_MIN_SCALE), opacity: 1 };
  }
  if (zoom >= ENDPOINT_FADE_END) {
    const t = (zoom - ENDPOINT_FADE_END) / (ENDPOINT_SHRINK_FLOOR - ENDPOINT_FADE_END);
    return { scale: ENDPOINT_MIN_SCALE, opacity: t };
  }
  return { scale: ENDPOINT_MIN_SCALE, opacity: 0 };
};

/** A zoom→interval rule: at zoom in `[min, max)` the km marker interval is `interval` km. */
export type IntervalRule = { min: number; max: number | null; interval: number };

/** How many zoom levels below the lowest rule the km markers fade out over. */
export const FADE_ZOOM_RANGE = 0.5;

/**
 * Default zoom→interval mapping. Lines are `<min>-<max>,<intervalKm>`:
 */
export const DEFAULT_ZOOM_INTERVAL_CONFIG = `11.5-,1
9.5-11.5,5
8.5-9.5,10`;

/**
 * Parses the zoom-interval config text. Each non-empty, non-comment line has the form
 * `<min>-<max>,<intervalKm>`, where `max` may be omitted for an open-ended upper bound
 * (e.g. `11-,1`) and `min` may be omitted for an open-ended lower bound. Floating point
 * numbers are supported. Invalid lines are ignored.
 */
export const parseZoomIntervalConfig = (text: string): IntervalRule[] => {
  const rules: IntervalRule[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    const [rangePart, intervalPart] = line.split(',');
    if (intervalPart === undefined) continue;
    const rangeMatch = rangePart.trim().match(/^(\d*\.?\d*)\s*-\s*(\d*\.?\d*)$/);
    if (!rangeMatch) continue;
    const interval = parseFloat(intervalPart.trim());
    if (!(interval > 0)) continue;
    const min = rangeMatch[1] === '' ? -Infinity : parseFloat(rangeMatch[1]);
    const max = rangeMatch[2] === '' ? null : parseFloat(rangeMatch[2]);
    if (Number.isNaN(min) || (max !== null && Number.isNaN(max))) continue;
    rules.push({ min, max, interval });
  }
  return rules;
};

/**
 * Determines the km marker interval and opacity for the given zoom level, based on the
 * parsed rules. Returns `null` when no markers should be shown at all (no rules).
 */
export const evaluateZoomInterval = (
  rules: IntervalRule[],
  zoom: number,
  fadeRange = FADE_ZOOM_RANGE
): { interval: number; opacity: number } | null => {
  if (rules.length === 0) return null;
  const sorted = [...rules].sort((a, b) => a.min - b.min);

  // Exact match.
  for (const r of sorted) {
    if (zoom >= r.min && (r.max === null || zoom < r.max)) {
      return { interval: r.interval, opacity: 1 };
    }
  }

  // Below the most zoomed-out rule: fade out over `fadeRange` zoom levels.
  const lowest = sorted[0];
  if (zoom < lowest.min) {
    const opacity = Math.max(0, Math.min(1, (zoom - (lowest.min - fadeRange)) / fadeRange));
    return { interval: lowest.interval, opacity };
  }

  // In a gap between rules (or above all upper bounds): use the closest lower rule.
  const lowerRules = sorted.filter((r) => zoom >= r.min);
  if (lowerRules.length) {
    const r = lowerRules[lowerRules.length - 1];
    return { interval: r.interval, opacity: 1 };
  }

  return null;
};

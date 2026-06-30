/**
 * Helpers for styling uploaded route (trail) files on the map.
 *
 * NOTE: part of a temporary prototype for route file display enhancements.
 */
import { along, length, lineString } from '@turf/turf';
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

/** A zoom→interval rule: at zoom in `[min, max)` the km marker interval is `interval` km. */
export type IntervalRule = { min: number; max: number | null; interval: number };

/** How many zoom levels below the lowest rule the km markers fade out over. */
export const FADE_ZOOM_RANGE = 1;

/**
 * Default zoom→interval mapping. Lines are `<min>-<max>,<intervalKm>`:
 * - `11-,1`   interval 1 km at zoom >= 11
 * - `8-11,5`  interval 5 km at zoom 8–11
 * - `7-8,10`  interval 10 km at zoom 7–8
 * Below zoom 7 (small-country-ish) no rule matches, so the markers fade out.
 */
export const DEFAULT_ZOOM_INTERVAL_CONFIG = ['11-,1', '8-11,5', '7-8,10'].join('\n');

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

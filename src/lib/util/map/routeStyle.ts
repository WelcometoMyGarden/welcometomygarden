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

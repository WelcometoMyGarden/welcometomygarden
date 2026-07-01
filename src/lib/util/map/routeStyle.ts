/**
 * Helpers for styling uploaded route (trail) files on the map.
 *
 * NOTE: part of a temporary prototype for route file display enhancements.
 */
import { along, distance, length, lineString } from '@turf/turf';
import type { Feature, FeatureCollection, Geometry, LineString, Point, Position } from 'geojson';

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

/**
 * A route extremity marker. `pause` is used for points produced by merging nearby
 * endpoints (see clusterEndpoints).
 */
export type RouteEndpoint = { type: 'start' | 'end' | 'pause'; lngLat: [number, number] };

/**
 * Merges endpoints that lie within `maxDistanceMeters` of each other into a single
 * marker placed at the cluster's midpoint (centroid). A merged cluster keeps its
 * shared type when all members are the same (start/end), and is rendered as a
 * `pause` marker when it mixes types.
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
    const allSameType = cluster.every((m) => m.type === cluster[0].type);
    const type = allSameType ? cluster[0].type : 'pause';
    return { type, lngLat: [lng, lat] };
  });
};

/** Zoom thresholds controlling start/end marker shrinking & fading. */
export const ENDPOINT_FULL_ZOOM = 8.5; // at/above: full size
export const ENDPOINT_SHRINK_FLOOR = 8.3; // 8.3–8.5: shrink down to ENDPOINT_MIN_SCALE
export const ENDPOINT_FADE_END = 7.8; // 7.8–8.3: fade out over 0.5 zoom levels; below: hidden
export const ENDPOINT_MIN_SCALE = 0.78; // smallest size markers ever reach (the size at zoom 8.3)

/**
 * Computes the start/end marker scale & opacity for a zoom level:
 * - zoom >= 8.5: full size, opaque
 * - 8.3–8.5: shrinks linearly down to ENDPOINT_MIN_SCALE
 * - 7.8–8.3: stays at the minimum size and fades out over 0.5 zoom levels
 * - below 7.8: hidden
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

/** A route paired with the colour it is drawn in on the map. */
export type ColoredRoute = { color: string; geoJson: FeatureCollection | Feature };

/** Max distance (m) between two routes to count as following "the same path". */
export const OVERLAP_THRESHOLD_M = 20;
/** Minimum sustained length (km) for a shared stretch to be treated as an overlap. */
export const OVERLAP_MIN_LENGTH_KM = 0.1;
/** Vertices closer than this (m) are dropped before scanning (accuracy vs. speed). */
export const OVERLAP_DECIMATE_M = 10;
/** Step (m) at which a route is sampled while scanning for overlaps. */
export const OVERLAP_SAMPLE_M = 25;

// --- Fast local planar geometry (accurate enough at the ~20 m scale) ---
const M_PER_DEG_LAT = 111_320;
type XY = [number, number];

/** Squared distance (m²) from point p to segment a–b, in projected metres. */
const pointSegDist2 = (p: XY, a: XY, b: XY): number => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = a[0] + t * dx - p[0];
  const cy = a[1] + t * dy - p[1];
  return cx * cx + cy * cy;
};

/** A uniform grid spatial index over projected segments, for fast proximity queries. */
const makeSegmentGrid = (segments: [XY, XY][], cell: number) => {
  const grid = new Map<string, [XY, XY][]>();
  for (const seg of segments) {
    const [a, b] = seg;
    const cx0 = Math.floor(Math.min(a[0], b[0]) / cell);
    const cx1 = Math.floor(Math.max(a[0], b[0]) / cell);
    const cy0 = Math.floor(Math.min(a[1], b[1]) / cell);
    const cy1 = Math.floor(Math.max(a[1], b[1]) / cell);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const key = `${cx},${cy}`;
        const bucket = grid.get(key);
        if (bucket) bucket.push(seg);
        else grid.set(key, [seg]);
      }
    }
  }
  return grid;
};

const isNearGrid = (grid: Map<string, [XY, XY][]>, p: XY, cell: number, thr2: number): boolean => {
  const cx = Math.floor(p[0] / cell);
  const cy = Math.floor(p[1] / cell);
  for (let ix = cx - 1; ix <= cx + 1; ix++) {
    for (let iy = cy - 1; iy <= cy + 1; iy++) {
      const bucket = grid.get(`${ix},${iy}`);
      if (!bucket) continue;
      for (const [a, b] of bucket) {
        if (pointSegDist2(p, a, b) <= thr2) return true;
      }
    }
  }
  return false;
};

/**
 * Detects stretches where two routes follow (roughly) the same path — not merely
 * crossing, but staying within `OVERLAP_THRESHOLD_M` of each other for at least
 * `OVERLAP_MIN_LENGTH_KM`. Each detected stretch is returned as a LineString carrying
 * the two routes' colours, so it can be drawn as an alternating two-colour line.
 *
 * Optimised for speed (this is the only heavy path, and runs only in overlap mode):
 * routes are decimated, projected to a local metric plane, indexed in a uniform grid,
 * and scanned in a single linear pass — turning the naive O(pairs × samples × vertices)
 * scan into ~O(vertices + samples).
 */
export const computeOverlapSegments = (
  routes: ColoredRoute[]
): FeatureCollection<LineString, { colorA: string; colorB: string }> => {
  const features: Feature<LineString, { colorA: string; colorB: string }>[] = [];

  // Reference latitude for the local projection (from the first available vertex).
  let lat0: number | undefined;
  for (const r of routes) {
    const lines = extractLines(r.geoJson);
    if (lines.length && lines[0].length) {
      lat0 = lines[0][0][1];
      break;
    }
  }
  if (lat0 === undefined) return { type: 'FeatureCollection', features };

  const kx = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  const project = (lng: number, lat: number): XY => [lng * kx, lat * M_PER_DEG_LAT];

  // Preprocess each route: decimate vertices, project to metres, and index its segments.
  const decimate2 = OVERLAP_DECIMATE_M * OVERLAP_DECIMATE_M;
  const prepped = routes.map((r) => {
    const lines: { ll: [number, number][]; xy: XY[] }[] = [];
    const segments: [XY, XY][] = [];
    for (const coords of extractLines(r.geoJson)) {
      const ll: [number, number][] = [];
      const xy: XY[] = [];
      let last: XY | null = null;
      for (let idx = 0; idx < coords.length; idx++) {
        const lng = coords[idx][0];
        const lat = coords[idx][1];
        const p = project(lng, lat);
        const keep =
          idx === 0 ||
          idx === coords.length - 1 ||
          !last ||
          (p[0] - last[0]) ** 2 + (p[1] - last[1]) ** 2 >= decimate2;
        if (keep) {
          ll.push([lng, lat]);
          xy.push(p);
          last = p;
        }
      }
      if (xy.length >= 2) {
        lines.push({ ll, xy });
        for (let s = 0; s < xy.length - 1; s++) segments.push([xy[s], xy[s + 1]]);
      }
    }
    return { color: r.color, lines, grid: makeSegmentGrid(segments, OVERLAP_THRESHOLD_M) };
  });

  const thr2 = OVERLAP_THRESHOLD_M * OVERLAP_THRESHOLD_M;
  const minLenM = OVERLAP_MIN_LENGTH_KM * 1000;

  for (let i = 0; i < prepped.length; i++) {
    for (let j = i + 1; j < prepped.length; j++) {
      const a = prepped[i];
      const b = prepped[j];
      if (!a.lines.length || !b.lines.length) continue;

      for (const line of a.lines) {
        // Single linear walk of the line, sampling every OVERLAP_SAMPLE_M metres and
        // testing proximity to route B via its grid; collect runs of "near" samples.
        const samples: { near: boolean; ll: [number, number] }[] = [];
        let acc = 0;
        let next = 0;
        for (let k = 0; k < line.xy.length - 1; k++) {
          const p0 = line.xy[k];
          const p1 = line.xy[k + 1];
          const l0 = line.ll[k];
          const l1 = line.ll[k + 1];
          const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
          if (segLen === 0) continue;
          while (next <= acc + segLen + 1e-6) {
            const t = (next - acc) / segLen;
            const p: XY = [p0[0] + t * (p1[0] - p0[0]), p0[1] + t * (p1[1] - p0[1])];
            samples.push({
              near: isNearGrid(b.grid, p, OVERLAP_THRESHOLD_M, thr2),
              ll: [l0[0] + t * (l1[0] - l0[0]), l0[1] + t * (l1[1] - l0[1])]
            });
            next += OVERLAP_SAMPLE_M;
          }
          acc += segLen;
        }

        let start = -1;
        for (let k = 0; k < samples.length; k++) {
          const near = samples[k].near;
          const last = k === samples.length - 1;
          if (near && start < 0) start = k;
          if ((!near || last) && start >= 0) {
            const endIdx = near ? k : k - 1;
            if ((endIdx - start) * OVERLAP_SAMPLE_M >= minLenM) {
              const coordinates = samples.slice(start, endIdx + 1).map((s) => s.ll);
              if (coordinates.length >= 2) {
                features.push({
                  type: 'Feature',
                  geometry: { type: 'LineString', coordinates },
                  properties: { colorA: a.color, colorB: b.color }
                });
              }
            }
            start = -1;
          }
        }
      }
    }
  }

  return { type: 'FeatureCollection', features };
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

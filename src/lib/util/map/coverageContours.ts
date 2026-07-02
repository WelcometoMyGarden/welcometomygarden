/**
 * Helpers for the /coveragegaps "isodistance" prototype tweak.
 *
 * Computes the union of fixed-radius buffers around every garden, whose outline
 * is the isodistance line at that radius from the nearest garden. Rendering only
 * the outline (no fill) highlights the 15/20/25 km coverage rings.
 *
 * NOTE: unioning a buffer around every garden is expensive. To keep it usable we
 * first decimate gardens onto a coarse grid — at the 15 km+ scale, many gardens
 * within a couple of km of each other produce an indistinguishable union, so one
 * representative per grid cell is effectively lossless while cutting the input
 * (and thus the work) dramatically in dense regions like Belgium.
 */
import { buffer } from '@turf/buffer';
import { union } from '@turf/union';
import { featureCollection, point } from '@turf/helpers';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import type { Garden } from '$lib/types/Garden';

/** Grid size (degrees) used to decimate gardens before buffering. ~2–3 km. */
const DECIMATION_CELL_DEG = 0.03;

/** Number of segments per quarter-circle for each buffer. Low = fewer vertices. */
const BUFFER_STEPS = 8;

/**
 * Reduce gardens to at most one representative per grid cell, returning [lng, lat]
 * tuples.
 */
const decimate = (gardens: Garden[], cellDeg = DECIMATION_CELL_DEG): [number, number][] => {
  const seen = new Set<string>();
  const points: [number, number][] = [];
  for (const garden of gardens) {
    if (!garden.location) continue;
    const { longitude, latitude } = garden.location;
    const key = `${Math.round(longitude / cellDeg)},${Math.round(latitude / cellDeg)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push([longitude, latitude]);
  }
  return points;
};

/**
 * Compute the union polygon of `radiusKm` buffers around all gardens.
 * Returns `null` if there are no gardens or the union could not be computed.
 */
export const computeIsodistanceUnion = (
  gardens: Garden[],
  radiusKm: number
): Feature<Polygon | MultiPolygon> | null => {
  const points = decimate(gardens);
  if (points.length === 0) return null;

  const buffers = points
    .map((coords) => buffer(point(coords), radiusKm, { units: 'kilometers', steps: BUFFER_STEPS }))
    .filter((f): f is Feature<Polygon | MultiPolygon> => !!f);

  if (buffers.length === 0) return null;
  if (buffers.length === 1) return buffers[0];

  return union(featureCollection(buffers));
};

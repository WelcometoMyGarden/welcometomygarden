const { randomUUID } = require('node:crypto');
const { logger } = require('firebase-functions/v2');
const {
  bboxPolygon,
  buffer,
  difference,
  featureCollection,
  point,
  truncate,
  union
} = require('@turf/turf');
const { db, storage } = require('../firebase');

// Precomputes "coverage" overlays for the WTMG /every15km landing page map.
//
// It fetches all *listed* gardens from Firestore, draws a circle of `RADIUS_KM`
// km around each one, and dissolves (unions) all those circles into a single
// (Multi)Polygon: the region that is at most `RADIUS_KM` km away from any
// garden. The result is written as GeoJSON, ready to be dropped into a Mapbox GL
// JS `geojson` source and rendered as a `fill` layer, together with its
// complement (the world minus the coverage, i.e. the "gap" overlay).
//
// Doing this at runtime in a mobile browser for thousands of points is slow and
// memory-heavy (buffering + unioning hundreds of thousands of vertices can
// freeze the UI for many seconds), which is why we precompute it here on a
// schedule and ship static files from Cloud Storage.

/** Distance (km) around a single garden that counts as "covered". Keep in sync
 * with `COVERAGE_RADIUS_KM` in the frontend's CoverageLayer.svelte. */
const RADIUS_KM = 15;
/** Circle smoothness: points per quadrant. 8 keeps circles smooth enough while
 * keeping the vertex count (and union cost) manageable. */
const STEPS = 8;
/** Coordinate decimal places kept in the output (5 ≈ 1m); shrinks the files. */
const PRECISION = 5;
/** Storage folder + filenames the frontend reads from (see constants.ts). */
const STORAGE_FOLDER = 'coverage';
const COVERAGE_FILENAME = 'garden-coverage.geojson';
const COMPLEMENT_FILENAME = 'garden-coverage-complement.geojson';
/** Browsers may cache the files this long. The download URL carries a fresh
 * token on every upload (see `uploadGeojson`), so a new version busts the cache
 * regardless — this only bounds staleness within a single already-loaded URL. */
const CACHE_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

/**
 * @param {unknown} loc
 * @returns {loc is { longitude: number; latitude: number }}
 */
function isValidLocation(loc) {
  if (!loc || typeof loc !== 'object') return false;
  const { longitude, latitude } = /** @type {any} */ (loc);
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    // Skip the null-island default that occasionally sneaks in
    !(longitude === 0 && latitude === 0)
  );
}

/**
 * Dissolve many polygons into one via a balanced binary reduction.
 *
 * A single `union` over all N polygons at once is memory-hungry and a naive
 * left-fold does O(N) huge intermediate unions. Tree reduction keeps each
 * martinez operation small, which is dramatically faster for thousands of
 * circles while producing the same dissolved geometry.
 *
 * @param {import('geojson').Feature[]} polygons
 * @param {number} batchSize
 * @returns {import('geojson').Feature | null}
 */
function dissolve(polygons, batchSize = 200) {
  let layer = polygons;
  let round = 0;
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += batchSize) {
      const batch = layer.slice(i, i + batchSize);
      next.push(batch.length === 1 ? batch[0] : union(featureCollection(batch)));
    }
    round += 1;
    logger.debug(`generateCoverage: dissolve round ${round}: ${layer.length} -> ${next.length}`);
    layer = next;
  }
  return layer[0] ?? null;
}

/**
 * Overwrite a file in the default Storage bucket with the given GeoJSON, making
 * it publicly readable through the Firebase Storage download API (like garden
 * images) and browser-cacheable. A fresh download token is minted on every
 * upload so the URL returned by the client SDK's `getDownloadURL` changes with
 * each new version, busting any browser/CDN cache.
 *
 * @param {string} filename
 * @param {import('geojson').FeatureCollection} geojson
 */
async function uploadGeojson(filename, geojson) {
  const bucket = storage.bucket();
  const file = bucket.file(`${STORAGE_FOLDER}/${filename}`);
  const body = JSON.stringify(geojson);
  await file.save(body, {
    resumable: false,
    contentType: 'application/geo+json',
    metadata: {
      cacheControl: `public, max-age=${CACHE_MAX_AGE_SECONDS}`,
      metadata: {
        // Minting a token here (a) lets the client SDK's getDownloadURL serve
        // the file and (b) changes the URL on every upload, so browsers refetch.
        firebaseStorageDownloadTokens: randomUUID()
      }
    }
  });
  logger.info(
    `generateCoverage: uploaded ${STORAGE_FOLDER}/${filename} (${(body.length / 1024).toFixed(0)} KB)`
  );
}

/**
 * Scheduled function that regenerates the garden coverage overlays and uploads
 * them to Cloud Storage. Runs every two hours (see registration in index.js).
 *
 * @returns {Promise<void>}
 */
module.exports = async () => {
  const snapshot = await db.collection('campsites').where('listed', '==', true).get();

  const listed = snapshot.docs.map((d) => d.data()).filter((g) => g && isValidLocation(g.location));
  logger.info(
    `generateCoverage: ${listed.length} listed gardens with a valid location ` +
      `(of ${snapshot.size} listed).`
  );
  if (listed.length === 0) {
    // Don't overwrite a good previous version with an empty overlay on a fluke.
    throw new Error('generateCoverage: no listed gardens with a valid location found.');
  }

  const circles = [];
  for (const g of listed) {
    const p = point([g.location.longitude, g.location.latitude]);
    const b = buffer(p, RADIUS_KM, { units: 'kilometers', steps: STEPS });
    if (b) circles.push(b);
  }

  logger.info(`generateCoverage: dissolving ${circles.length} circles into one region`);
  let coverage = dissolve(circles);
  if (!coverage) throw new Error('generateCoverage: dissolve produced no geometry.');

  // Derive the "gap" overlay: everything NOT within RADIUS_KM of a garden. It's
  // a single polygon spanning the (web-mercator-safe) world with every coverage
  // region punched out as a hole, so it renders as one semi-transparent fill
  // sitting edge-to-edge with the green coverage.
  const world = bboxPolygon([-180, -85, 180, 85]);
  let complement = difference(featureCollection([world, coverage]));
  if (!complement) throw new Error('generateCoverage: complement produced no geometry.');
  complement = truncate(complement, { precision: PRECISION, coordinates: 2, mutate: true });
  complement.properties = { kind: 'garden-coverage-complement', radiusKm: RADIUS_KM };

  // Round coordinates to shrink the file (5 decimals ≈ 1m).
  coverage = truncate(coverage, { precision: PRECISION, coordinates: 2, mutate: true });
  coverage.properties = {
    kind: 'garden-coverage',
    radiusKm: RADIUS_KM,
    gardenCount: listed.length
  };

  await Promise.all([
    uploadGeojson(COVERAGE_FILENAME, featureCollection([coverage])),
    uploadGeojson(COMPLEMENT_FILENAME, featureCollection([complement]))
  ]);

  logger.info('generateCoverage: done.');
};

const { randomUUID } = require('node:crypto');
const { logger } = require('firebase-functions/v2');
const { projectID } = require('firebase-functions/params');
const { storage } = require('../firebase');
const { campsitesCol } = require('../collections');

// Generates the public "listed gardens" file that the map consumes.
//
// Instead of every map visitor querying all listed gardens from Firestore
// (thousands of document reads per map load), we precompute a single minimal
// JSON file with only the fields the map needs, and serve it from Cloud Storage.
// Each garden is a compact row without field names (see `ListedGardenRow` in
// src/lib/types/Garden.ts). The rest of the garden details (description, ...) are
// fetched per garden from Firestore when a garden is opened.
//
// Regeneration is driven by campsite writes, debounced via Cloud Tasks; see
// `./regenerate.js`.

/** Storage path the frontend reads from. Keep in sync with `src/lib/api/garden.ts`. */
const LISTED_GARDENS_PATH = 'gardens-agg/listed-public.json';
/** Coordinate decimal places kept in the output (5 ≈ 1m). */
const PRECISION = 5;
/**
 * Browsers may cache the file this long. The download URL carries a fresh token
 * on every upload, so a new version busts the cache regardless; and the old token
 * stops working when the new version is uploaded. This only bounds staleness of
 * an already-resolved URL.
 */
const CACHE_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

/** Current file format version. Bump on breaking changes, and update the frontend parser. */
const FILE_VERSION = 1;

/**
 * Boolean facilities that are published, in `facilityBits` order: the facility at
 * index `i` is encoded as bit `1 << i`. Anything else in a garden's `facilities`
 * map is dropped.
 *
 * MUST stay identical to `FACILITY_BITS_ORDER` in src/lib/util/listed-gardens.ts.
 * Only ever append to it: reordering changes the meaning of existing bits.
 * @type {readonly (keyof import('../../../src/lib/types/Garden').BooleanGardenFacilities)[]}
 */
const FACILITY_BITS_ORDER = /** @type {const} */ ([
  'water',
  'drinkableWater',
  'toilet',
  'bonfire',
  'electricity',
  'shower'
]);

const FACTOR = 10 ** PRECISION;
/** @param {number} n */
const round = (n) => Math.round(n * FACTOR) / FACTOR;

/**
 * Accepts only finite, in-range coordinates; the map can't render anything else.
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
    longitude <= 180
  );
}

/**
 * The photo file extension without period, or `''` if there is no photo.
 * Photo names look like `garden.jpg`; the frontend only needs the extension to
 * derive the (resized) photo paths.
 * @param {unknown} photo
 */
function photoExtension(photo) {
  if (typeof photo !== 'string') return '';
  const dot = photo.lastIndexOf('.');
  return dot > -1 ? photo.slice(dot + 1) : '';
}

/**
 * Map a garden document to its compact public row:
 * `[id, lat, lng, facilityBits, capacity, ext]`.
 * Everything else (`description`, `listed`, timestamps, ...) is dropped.
 *
 * @param {string} id
 * @param {Partial<Garden> | undefined} data
 * @returns {ListedGardenRow | null} `null` if the garden can't be shown on a map
 */
function toGardenRow(id, data) {
  if (!data || !isValidLocation(data.location)) {
    return null;
  }
  const facilities = /** @type {Record<string, unknown>} */ (data.facilities ?? {});
  const facilityBits = FACILITY_BITS_ORDER.reduce(
    (bits, key, i) => (facilities[key] === true ? bits | (1 << i) : bits),
    0
  );
  const capacity = Number(facilities.capacity);
  return [
    id,
    round(data.location.latitude),
    round(data.location.longitude),
    facilityBits,
    // Same fallback as the garden drawer; also guarantees a number.
    Number.isFinite(capacity) && capacity > 0 ? capacity : 1,
    photoExtension(data.photo)
  ];
}

/**
 * Whether a campsite write may change the published file, i.e. whether the
 * public projection of the garden (including whether it's listed) changed.
 * Writes that only touch e.g. the description or bookkeeping timestamps don't.
 *
 * @param {Partial<Garden> | null | undefined} before
 * @param {Partial<Garden> | null | undefined} after
 * @param {string} id
 */
function isPublicProjectionChanged(before, after, id) {
  /** @param {Partial<Garden> | null | undefined} d */
  const project = (d) => (d?.listed === true ? toGardenRow(id, d) : null);
  return JSON.stringify(project(before)) !== JSON.stringify(project(after));
}

/**
 * Build the file contents from campsite documents.
 * @param {{ id: string, data: () => Partial<Garden> | undefined }[]} docs
 * @param {Date} [now]
 * @returns {ListedGardensFile}
 */
function buildListedGardensFile(docs, now = new Date()) {
  const gardens = docs
    .map((d) => toGardenRow(d.id, d.data()))
    .filter(/** @returns {g is ListedGardenRow} */ (g) => g != null)
    // Deterministic output: identical data produces an identical file.
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return { version: FILE_VERSION, generatedAt: now.toISOString(), gardens };
}

/**
 * Queries all listed gardens, and overwrites the public listed gardens file in
 * the default Storage bucket.
 *
 * @returns {Promise<{ count: number; bytes: number }>}
 */
async function generateListedGardensFile() {
  const snapshot = await campsitesCol()
    .where('listed', '==', true)
    // Only fetch what we need: descriptions are by far the largest part of a garden.
    // Note: this does not reduce billed reads (1 per document), only transfer & memory.
    .select('location', 'facilities', 'photo')
    .get();

  const file = buildListedGardensFile(snapshot.docs);
  const skipped = snapshot.size - file.gardens.length;
  if (skipped > 0) {
    logger.warn(
      `generateListedGardensFile: skipped ${skipped} listed gardens without a valid location`
    );
  }

  // Don't overwrite a good previous version with an empty file on a fluke.
  // Local (demo) emulator environments legitimately start without gardens.
  if (file.gardens.length === 0 && !projectID.value().startsWith('demo-')) {
    throw new Error('generateListedGardensFile: no listed gardens with a valid location found.');
  }

  const body = JSON.stringify(file);
  await storage
    .bucket()
    .file(LISTED_GARDENS_PATH)
    .save(body, {
      // Single request: the content and metadata (incl. new token) are swapped atomically.
      resumable: false,
      // Store gzip-compressed (sets `Content-Encoding: gzip`), which cuts egress
      // a few times further. Browsers decompress transparently.
      gzip: true,
      contentType: 'application/json',
      metadata: {
        cacheControl: `public, max-age=${CACHE_MAX_AGE_SECONDS}`,
        metadata: {
          // Minting a token here (a) lets the client SDK's getDownloadURL serve
          // the file and (b) changes the URL on every upload, so browsers refetch.
          firebaseStorageDownloadTokens: randomUUID(),
          gardenCount: String(file.gardens.length),
          generatedAt: file.generatedAt
        }
      }
    });

  logger.info(
    `generateListedGardensFile: uploaded ${LISTED_GARDENS_PATH} with ${file.gardens.length} gardens ` +
      `(${(body.length / 1024).toFixed(0)} KB uncompressed)`
  );
  return { count: file.gardens.length, bytes: body.length };
}

module.exports = {
  LISTED_GARDENS_PATH,
  FILE_VERSION,
  FACILITY_BITS_ORDER,
  toGardenRow,
  isPublicProjectionChanged,
  buildListedGardensFile,
  generateListedGardensFile
};

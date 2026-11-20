import type {
  BooleanGardenFacilities,
  GardenFacilities,
  GardenSummary,
  ListedGardenRow,
  ListedGardensFile
} from '$lib/types/Garden';

/** The listed gardens file format version that this parser supports */
export const SUPPORTED_FILE_VERSION = 1;

/**
 * Boolean facilities in `facilityBits` order: the facility at index `i` is
 * encoded as bit `1 << i`.
 *
 * MUST stay identical to `FACILITY_BITS_ORDER` in api/src/gardenIndex/generate.js.
 * Only ever append to it: reordering changes the meaning of existing bits.
 */
export const FACILITY_BITS_ORDER = [
  'water',
  'drinkableWater',
  'toilet',
  'bonfire',
  'electricity',
  'shower'
] as const satisfies readonly (keyof BooleanGardenFacilities)[];

/**
 * Decode a compact `[id, lat, lng, facilityBits, capacity, ext]` row.
 * Only facilities that are present are set (as `true`), like in the
 * Firestore data, absent facilities should be treated as false.
 */
export const parseListedGardenRow = ([
  id,
  latitude,
  longitude,
  facilityBits,
  capacity,
  ext
]: ListedGardenRow): GardenSummary => {
  const facilities: GardenFacilities = { capacity };
  FACILITY_BITS_ORDER.forEach((key, i) => {
    if (facilityBits & (1 << i)) facilities[key] = true;
  });
  return {
    id,
    location: { latitude, longitude },
    facilities,
    photo: ext ? `garden.${ext}` : null
  };
};

/**
 * Decode the gardens in a listed gardens file.
 * @throws if the file has an unsupported format version
 */
export const parseListedGardensFile = (file: ListedGardensFile): GardenSummary[] => {
  if (file?.version !== SUPPORTED_FILE_VERSION || !Array.isArray(file.gardens)) {
    throw new Error(`Unsupported listed gardens file version: ${file?.version}`);
  }
  return file.gardens.map(parseListedGardenRow);
};

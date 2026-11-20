import { Timestamp } from 'firebase/firestore';

/**
 * The possible Firebase document data of a campsite/garden
 */
export type FirebaseGarden = {
  description: string;
  location: LongLat;
  facilities: GardenFacilities;
  /**
   * This looks like: 'garden.jpg', 'garden.JPG', 'garden.JPEG', ... or null. Never undefined.
   */
  photo: null | string;
  listed: boolean;
  /**
   * When the listed property boolean garden was last changed.
   * Undefined or null when the garden was never changed (after creation it will always be "true").
   * This thus shows the last time a garden was unlisted or relisted.
   *
   * Guaranteed to equal `latestRemovedAt` when the last unlisting was due to removal.
   * @since 2024-08-11
   */
  latestListedChangeAt?: Timestamp;
  /**
   * When this campsite was last removed from the map by administration, or inactive cleanup processes.
   * @since 2024-08-11
   */
  latestRemovedAt?: Timestamp;
  /** When the host was last sent an email to remind them that being active is important.
   * @since 2024-08-11
   */
  latestWarningForInactivityAt?: Timestamp;
};

/**
 * A garden document with its Firebase doc id embedded in the object,
 * derived from a FirebaseGarden for local use.
 */
export type Garden = {
  id: string;
  /**
   * base64 encoded version of the garden photo.
   * This is only set if this garden was just added, or just updated, with a new photo.
   */
  localPhotoData?: string;
} & FirebaseGarden;

/**
 * The minimal, public projection of a listed garden, as decoded from the
 * precomputed listed gardens file (see {@link ListedGardenRow}).
 */
export type GardenSummary = {
  id: string;
  location: LongLat;
  facilities: GardenFacilities;
  /** Like 'garden.jpg', or null without photo. */
  photo: string | null;
};

/**
 * A garden in the precomputed listed gardens file: a compact row without field names.
 *
 * - `lat`, `lng`: rounded to 5 fractional digits (~1m)
 * - `facilityBits`: bit `i` is set when the boolean facility at index `i` of
 *   `FACILITY_BITS_ORDER` (`src/lib/util/listed-gardens.ts`) is true
 * - `ext`: the photo file extension without period (the photo name is always `garden.<ext>`),
 *   or `''` when the garden has no photo
 */
export type ListedGardenRow = [
  id: string,
  lat: number,
  lng: number,
  facilityBits: number,
  capacity: number,
  ext: string
];

/**
 * Shape of the precomputed `gardens-agg/listed-public.json` file in Cloud Storage.
 * See `api/src/gardenIndex/generate.js`.
 */
export type ListedGardensFile = {
  /** Format version, bump on breaking changes to this shape */
  version: 1;
  /** ISO timestamp of when the file was generated */
  generatedAt: string;
  gardens: ListedGardenRow[];
};

/**
 * A garden as held in the map's listed gardens store.
 *
 * This is at least a {@link GardenSummary} (from the precomputed file), but it may
 * carry the full garden details in some cases, like the logged-in user's own garden.
 * Check for `description` to know whether the details are present; if not,
 * fetch the full garden with `getGarden()`.
 */
export type MapGarden = GardenSummary & Partial<Omit<Garden, keyof GardenSummary>>;

/**
 * Whether the given map garden carries the full garden details.
 */
export const hasGardenDetails = (garden: MapGarden): garden is Garden =>
  typeof garden.description === 'string';

/**
 * Subset of fields of a Garden that has a photo
 */
export type GardenPhoto = { id: string; photo: string };

/**
 * A work-in-progress garden that is edited by the garden add/manage form.
 * While editing, `location` may be `null` (no coordinate picked yet); the form
 * guarantees it is set before submitting — see {@link GardenSubmission}.
 */
export type GardenDraft = Omit<FirebaseGarden, 'photo' | 'location'> & {
  location: LongLat | null;
  photo: {
    /**
     * Should contain a File reference to the only selected photo in the first array position.
     */
    files: FileList | undefined | null;
    /**
     * After the selection of a photo, a base64 version will be loaded in the browser for immediate display.
     */
    data: string | null;
  };
};

/**
 * A {@link GardenDraft} that has passed the form's runtime validation, so its
 * `location` is guaranteed to be set. This is what the add/manage form emits on
 * submit (see `Form.svelte`'s `handleSubmit`).
 */
export type GardenSubmission = GardenDraft & { location: LongLat };

/**
 * A garden to add or update. It has a File reference in case the garden photo should be changed.
 */
export type GardenToAdd = Omit<FirebaseGarden, 'photo'> & {
  photo: File | null;
};

export type LongLat = {
  longitude: number;
  latitude: number;
};

export type GardenFacilities = {
  capacity: number;
  toilet?: boolean;
  shower?: boolean;
  electricity?: boolean;
  water?: boolean;
  drinkableWater?: boolean;
  bonfire?: boolean;
};

export type BooleanGardenFacilities = Omit<GardenFacilities, 'capacity'>;

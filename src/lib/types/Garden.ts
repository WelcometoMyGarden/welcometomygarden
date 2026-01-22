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
 * Subset of fields of a Garden that has a photo
 */
export type GardenPhoto = { id: string; photo: string };

/**
 * A work-in-progress garden that is edited by the garden add/manage form
 */
export type GardenDraft = Omit<FirebaseGarden, 'photo'> & {
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

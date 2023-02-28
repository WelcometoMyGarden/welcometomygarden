type FileToUpload = {
  // A handle for uploading
  file: File;
  // For instant local previewing after selecting
  data: null | string;
};

export type FirebaseGarden = {
  description: string;
  location: LatLong;
  facilities: GardenFacilities;
  photo: string | null;
  /**
   * An old name for photos. Some 83 gardens have a string previousPhotoId,
   * of which 1 at the time of writing also has a string photo.
   * 1480 don't have a value (undefined)
   */
  previousPhotoId?: null | string;
  listed: boolean;
  /**
   * Ignore this property, we should eventually remove it.
   * This is used to identify the garden locally, to merge it in the local store
   * but it seems redundant information, as it is only set to the Firebase UID/document ID,
   * which can already be merged into our local representation (see the way chats are stored).
   * There are some 2865+- campsites that don't have this property (accounts since commit 6ad2864822a6a6cce4c88a02a2e1e68365cb66d9).
   * For all others, this property is exactly equal to the uid.
   * @deprecated
   */
  id?: string;
  /**
   * @deprecated A property lingering around from the starting days of WTMG, we should remove it.
   * Gardens were first part of a Google Form/Sheet, which was displayed on a uMap.
   * When the Firebase auth & database was set up, users could claim their pre-existing garden.
   * All 482 gardens that have this property have been claimed.
   * See: https://slowby.slack.com/archives/C042P4HUCUF/p1677258597473709?thread_ts=1677257149.341639
   */
  unclaimed?: false;
};

export type GardenWithId = Omit<FirebaseGarden, 'id'> & { id: string };

export type Garden = FirebaseGarden;

/**
 * Supertype of FirebaseGarden.
 * Includes a possible temporary local representation of an unuploaded garden photo */
export type GardenToUpload = Omit<FirebaseGarden, 'photo'> & {
  photo: FileToUpload | string | null;
};

export type LatLong = {
  latitude: number;
  longitude: number;
};

export type GardenFacilities = {
  capacity: number;
  toilet: boolean;
  shower: boolean;
  electricity: boolean;
  water: boolean;
  drinkableWater: boolean;
  bonfire: boolean;
  tent: boolean;
};

export const initialCoordinates = {
  latitude: 50.5,
  longitude: 4.5
};

export const initialGarden: Garden = {
  description: '',
  location: {
    ...initialCoordinates
  },
  facilities: {
    capacity: 1,
    toilet: false,
    shower: false,
    electricity: false,
    water: false,
    drinkableWater: false,
    bonfire: false,
    tent: false
  },
  photo: null,
  listed: true
};

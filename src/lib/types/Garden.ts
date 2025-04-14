import { Timestamp } from 'firebase/firestore';

export type Garden = {
  /**
   * TODO: we should inspect this property, eventually remove it from Firestore.
   * This is used to identify the garden locally, to merge it in the local store
   * but it seems redundant information, as it is only set to the Firebase UID/document ID,
   * which can already be merged into our local representation (see the way chats are stored).
   * There are some 2865+- campsites that don't have this property (accounts since commit 6ad2864822a6a6cce4c88a02a2e1e68365cb66d9).
   * For all others, this property is exactly equal to the uid.
   */
  id?: string;
  description: string;
  /**
   * TODO: can this actually be null? Check if any such gardens exist. They shouldn't!
   */
  location: null | LongLat;
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
  /**
   * @deprecated A property lingering around from the starting days of WTMG, we should remove it.
   * Gardens were first part of a Google Form/Sheet, which was displayed on a uMap.
   * When the Firebase auth & database was set up, users could claim their pre-existing garden.
   * All 461 gardens that have this property have been claimed.
   * See: https://slowby.slack.com/archives/C042P4HUCUF/p1677258597473709?thread_ts=1677257149.341639
   */
  unclaimed?: false;
  /**
   * This is the id of the temporary "claimant" user.
   * AFAIK, all users have been "claimed" (see above). 461 have unclaimed === false
   * There are a few instances where gardens/${id} still stores images with the claimant IDs,
   * but the display of this is broken due to missing recorded extensions, see https://www.notion.so/slowby/Clean-up-garden-campsite-previousPhotoId-unclaimed-id-1d54f49e318e801dae7aceadb33f0379
   * 4690 null, 2543 undefined.
   */
  previousPhotoId?: null | undefined | string;
};

export type GardenWithPhoto = Omit<Garden, 'photo'> & { photo: string };

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
  tent?: boolean;
};

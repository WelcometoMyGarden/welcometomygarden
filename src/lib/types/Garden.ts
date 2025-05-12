import { Timestamp } from 'firebase/firestore';

export type FirebaseGarden = {
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
};

export type Garden = {
  id?: string;
} & FirebaseGarden;

export type GardenWithPhoto = Omit<Garden, 'photo'> & { photo: string };

export type GardenToAdd = Omit<Garden, 'photo'> & {
  photo: { files: FileList | undefined | null; data: string | null };
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
  tent?: boolean;
};

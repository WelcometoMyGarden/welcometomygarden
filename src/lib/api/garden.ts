import type { User } from '$lib/models/User';
import { CAMPSITES, USERS_PRIVATE } from './collections';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocFromCache,
  getDocFromServer,
  getDoc,
  writeBatch,
  Timestamp,
  type CollectionReference
} from 'firebase/firestore';
import { getUser, user } from '$lib/stores/auth';
import {
  isUploading,
  uploadProgress,
  allListedGardens,
  isFetchingGardens,
  updateGardenLocally,
  hasLoaded as gardenHasLoaded
} from '$lib/stores/garden';
import { supabase } from '$lib/stores/auth';
import { db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import {
  hasGardenDetails,
  type FirebaseGarden,
  type Garden,
  type GardenFacilities,
  type GardenPhoto,
  type GardenToAdd,
  type ListedGardensFile,
  type MapGarden
} from '$lib/types/Garden';
import { get } from 'svelte/store';
import logger from '$lib/util/logger';
import { parseListedGardensFile } from '$lib/util/listed-gardens';

/**
 * Get a single garden, if it exists and is listed. Returns `null` otherwise.
 * @param id  the garden id
 */
export const getGarden = async (id: string): Promise<Garden | null> => {
  const gardenDoc = await getDoc(
    doc(collection(db(), CAMPSITES) as CollectionReference<FirebaseGarden, FirebaseGarden>, id)
  );
  const data = gardenDoc.data();
  if (gardenDoc.exists() && data?.listed) {
    return {
      id: gardenDoc.id,
      ...data
    } satisfies Garden;
  } else {
    return null;
  }
};

/**
 * Path of the precomputed public listed gardens file in the default Storage bucket.
 * It is regenerated (debounced) on garden changes by the `regenerateGardenIndex`
 * Cloud Function. See api/src/gardenIndex/generate.js.
 */
export const LISTED_GARDENS_PATH = 'gardens-agg/listed-public.json';

const fetchListedGardensFile = async (): Promise<ListedGardensFile> => {
  // Resolve the URL every time: it carries a download token that changes with every
  // regeneration of the file. Prior tokens will not be valid anymore.
  const url = await getDownloadURL(ref(storage(), LISTED_GARDENS_PATH));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Fetching the listed gardens file failed with status ${response.status}`);
  }
  return (await response.json()) as ListedGardensFile;
};

/**
 * The current user's own garden is kept up-to-date locally (via its Firestore listener and
 * optimistic updates), while the file may lag behind by up to a minute after a change.
 * Reflect the local state in the given list, so a host always sees their latest garden state.
 *
 * @param gardens will be mutated
 * @param previousGardens the gardens before reloading, to retain local-only data
 */
const applyOwnGarden = (gardens: MapGarden[], previousGardens: MapGarden[]) => {
  const currentUser = get(user);
  if (!currentUser?.id) return;
  const { id } = currentUser;

  const previousOwn = previousGardens.find((g) => g.id === id);
  let own: MapGarden | null = null;
  if (currentUser.garden) {
    own = {
      ...currentUser.garden,
      id,
      // Retain a photo that was just uploaded, and of which the resized versions may not exist yet.
      ...(previousOwn?.localPhotoData ? { localPhotoData: previousOwn.localPhotoData } : {})
    };
  } else if (!get(gardenHasLoaded)) {
    // The user's garden state isn't known yet: retain local details if we had any.
    if (previousOwn && hasGardenDetails(previousOwn)) own = previousOwn;
  }
  if (!own) return;

  const index = gardens.findIndex((g) => g.id === id);
  if (own.listed === false) {
    if (index > -1) gardens.splice(index, 1);
  } else if (index > -1) {
    gardens[index] = own;
  } else {
    gardens.push(own);
  }
};

let listedGardensRequest: Promise<MapGarden[]> | null = null;

/**
 * (Re)load all listed gardens from the precomputed listed gardens file, and replace the
 * contents of the `allListedGardens` store with them.
 *
 * Call this every time the gardens are needed (e.g. when opening the map), so that newer versions
 * of the file are picked up. Concurrent calls share the same request.
 *
 * Note that the loaded gardens are {@link MapGarden}s that don't have their details (like
 * `description` or `photo`): use {@link getGarden} to fetch those.
 */
export const getAllListedGardens = (): Promise<MapGarden[]> => {
  if (listedGardensRequest) {
    return listedGardensRequest;
  }
  listedGardensRequest = (async () => {
    logger.log('Starting to fetch all gardens...');
    isFetchingGardens.set(true);
    try {
      let file: ListedGardensFile;
      try {
        file = await fetchListedGardensFile();
      } catch (e) {
        // The file may have been replaced between resolving its URL and fetching it,
        // which invalidates the old URL's token. Retry once with a fresh URL.
        logger.warn('Fetching the listed gardens file failed, retrying once', e);
        file = await fetchListedGardensFile();
      }
      const gardens: MapGarden[] = parseListedGardensFile(file);
      applyOwnGarden(gardens, get(allListedGardens));
      allListedGardens.set(gardens);
      logger.log(`Fetched ${gardens.length} gardens (generated at ${file.generatedAt})`);
      return gardens;
    } finally {
      isFetchingGardens.set(false);
      listedGardensRequest = null;
    }
  })();
  return listedGardensRequest;
};

const doUploadGardenPhoto = async (photo: File, currentUser: User) => {
  const extension = photo.name.split('.').pop();
  const photoLocation = `gardens/${currentUser.id}/garden.${extension}`;
  isUploading.set(true);
  const photoRef = ref(storage(), photoLocation);

  const uploadTask = uploadBytesResumable(photoRef, photo, { contentType: photo.type });
  uploadTask.on('state_changed', (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    uploadProgress.set(progress);
  });
  // TODO: handle errors
  await uploadTask;
  isUploading.set(false);
  uploadProgress.set(0);
  return `garden.${extension}`;
};

export const addGarden = async ({ photo, facilities, ...rest }: GardenToAdd) => {
  const currentUser = getUser();

  let uploadedName = null;
  if (photo) uploadedName = await doUploadGardenPhoto(photo, currentUser);

  // Copy the facilities object, converting any falsy value to false
  // TODO: is this conversion necessary?
  const facilitiesCopy = Object.fromEntries(
    Object.entries(facilities).map(([k, v]) => [k, v || false])
  );

  const garden = {
    ...rest,
    facilities: facilitiesCopy as GardenFacilities,
    listed: true,
    photo: uploadedName
  };

  await setDoc(doc(db(), CAMPSITES, currentUser.id), garden);

  const gardenWithId = { ...garden, id: currentUser.id } satisfies Garden;
  // Optimistic in-place update before the update streams back in via the snapshot
  // listener (which calls user.set). Note that the caller of this function will
  // add the garden to the allGardens store.
  currentUser.garden = gardenWithId;
  return gardenWithId;
};

/**
 * If a new garden photo should be uploaded, pass a File reference to the photo prop
 * In any other case, this will ignore photo prop and not overwrite it.
 * @returns
 */
export const updateGarden = async ({ photo: newPhotoFile, ...rest }: GardenToAdd) => {
  const currentUser = getUser();
  if (!currentUser.id) throw new Error('User is not logged in.');
  const previousGarden = currentUser.garden!;

  // Only include the photo prop if the photo changed, that is, if it is not null and was successfully uploaded
  let photoProp: { photo?: string } = {};
  if (newPhotoFile) {
    const uploadedName = await doUploadGardenPhoto(newPhotoFile, currentUser);
    photoProp = {
      // In this case, uploadedName should be the uploaded new photo (or changed photo)
      // Include it in the update
      photo: uploadedName
    };
  }

  // Copy the facilities object, converting any falsy value to false
  // TODO: is this conversion necessary?
  const facilitiesCopy = Object.fromEntries(
    Object.entries(rest.facilities).map(([k, v]) => [k, v || false])
  );

  const updatedGarden = {
    ...rest,
    facilities: facilitiesCopy as GardenFacilities,
    ...photoProp
  };

  const docRef = doc(db(), CAMPSITES, currentUser.id);

  await updateDoc(docRef, updatedGarden);

  const gardenWithId = {
    ...updatedGarden,
    id: currentUser.id,
    // Reuse the old photo name if it was not changed (the extension may be different)
    photo: updatedGarden.photo ?? previousGarden.photo ?? null
  };
  // Optimistic in-place update before the update streams back in
  // TODO: this might not be necessary anymore, depends on whether the updateDoc
  // snaphost listeners handle the update synchronously
  getUser().garden = gardenWithId;
  return gardenWithId;
};

/** Optimistically reflect a new `listed` value in the local listed-gardens store + the map. */
const updateLocalListedStatus = (listed: boolean) => {
  const currentUser = getUser();
  if (currentUser.garden) {
    updateGardenLocally({ id: currentUser.id, ...currentUser.garden, listed });
  }
};

export const unlistGardenUntil = async (returnDate: Date) => {
  const currentUser = getUser();
  if (!currentUser.id) throw new Error('User is not logged in.');

  // The campsite `listed` flag and the `relistGardenAt` date must change together, so write them
  // atomically in a single batch.
  const batch = writeBatch(db());
  batch.update(doc(db(), CAMPSITES, currentUser.id), { listed: false });
  batch.update(doc(db(), USERS_PRIVATE, currentUser.id), {
    relistGardenAt: Timestamp.fromDate(returnDate)
  });
  await batch.commit();

  updateLocalListedStatus(false);
};

/**
 * Unlist the garden indefinitely. Only clears `relistGardenAt` when one was previously set,
 * to avoid an unnecessary `users-private` write.
 */
export const unlistGardenIndefinitely = async () => {
  const currentUser = getUser();
  if (!currentUser.id) throw new Error('User is not logged in.');

  const batch = writeBatch(db());
  batch.update(doc(db(), CAMPSITES, currentUser.id), { listed: false });
  if (currentUser.relistGardenAt != null) {
    batch.update(doc(db(), USERS_PRIVATE, currentUser.id), { relistGardenAt: null });
  }
  await batch.commit();

  updateLocalListedStatus(false);
};

/**
 * Relist the garden immediately.
 */
export const relistGardenNow = async () => {
  const currentUser = getUser();
  if (!currentUser.id) throw new Error('User is not logged in.');

  const batch = writeBatch(db());
  batch.update(doc(db(), CAMPSITES, currentUser.id), { listed: true });
  if (currentUser.relistGardenAt != null) {
    batch.update(doc(db(), USERS_PRIVATE, currentUser.id), { relistGardenAt: null });
  }
  await batch.commit();

  updateLocalListedStatus(true);
};

const getPhotoBySize = async (size: string, garden: GardenPhoto) => {
  const photoLocation = `gardens/${garden.id}/garden_${size}.${garden.photo.split('.').pop()}`;
  const photoRef = ref(storage(), photoLocation);

  return await getDownloadURL(photoRef);
};

export const getGardenPhotoSmall = async (garden: GardenPhoto) => {
  return await getPhotoBySize('360x360', garden);
};

export const getGardenPhotoBig = async (garden: GardenPhoto) => {
  return await getPhotoBySize('1920x1080', garden);
};

export const hasGarden = async (userId: string) => {
  let snapshot;
  const docRef = doc(db(), CAMPSITES, userId);
  try {
    snapshot = await getDocFromCache(docRef);
  } catch (error) {
    // probably not cached
    snapshot = await getDocFromServer(docRef);
  }
  return snapshot ? snapshot.exists() && snapshot.data().listed : false;
};

export type ResponseTime =
  | {
      response_time_days: null;
      response_time_key: 'few_hours' | 'within_week' | 'over_week';
    }
  | {
      // filled for cases between 1 & 6 days
      response_time_days: number;
      response_time_key: 'days';
    };
/**
 * Completely null when the host has not received any chats yet
 */
type ResponseRateTimeResponse = {
  /**
   * Whether this host has any requests that should be counted
   */
  has_requests: true;
  /**
   * Responded requests among the last 10 that should be considered
   */
  last_10_responded_count: number;
  /**
   * Whether the host has more than 10 requests in reality
   */
  more_than_10_requests: boolean;
  /**
   * Count of requests that should be considered, max 10 back.
   */
  requests_count: number;
  /**
   * Response rate as a fraction
   */
  response_rate: number;
} & ResponseTime;

export type DisplayResponseRateTime =
  | {
      /**
       * The host has no requests, or none that should be counted (unanswered < 7 days)
       */
      has_requests: false;
      requests_count: 0;
    }
  | ResponseRateTimeResponse;

/**
 * @param gardenId
 * @returns null if Supabase is not loaded,
 *  the loaded user is not qualified for the request, or if an error occurred
 */
export const getGardenResponseRate = async (
  gardenId: string
): Promise<DisplayResponseRateTime | null> => {
  const _user = get(user);
  if (get(supabase) && (_user?.superfan || gardenId === _user?.id)) {
    // https://supabase.com/docs/reference/javascript/typescript-support#helper-types-for-tables-and-joins
    const { error, data } = await get(supabase)!
      .rpc('get_response_rate_time', { p_host: gardenId })
      .single()
      .overrideTypes<ResponseRateTimeResponse>();
    if (error) {
      logger.error(error);
    } else {
      if (!data) {
        // requests: none if actually none, or if no <7d reqs were answered yet
        // shouldn't happen, as the function should always return something
        return { requests_count: 0, has_requests: false };
      } else {
        return data as ResponseRateTimeResponse;
      }
    }
  }
  return null;
};

import type { User } from '$lib/models/User';
import { CAMPSITES } from './collections';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocFromCache,
  getDocFromServer,
  getDoc,
  type CollectionReference
} from 'firebase/firestore';
import { getUser, user } from '$lib/stores/auth';
import {
  isUploading,
  uploadProgress,
  allListedGardens,
  isFetchingGardens
} from '$lib/stores/garden';
import { supabase } from '$lib/stores/auth';
import { db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import type {
  FirebaseGarden,
  Garden,
  GardenFacilities,
  GardenPhoto,
  GardenToAdd
} from '$lib/types/Garden';
import { get } from 'svelte/store';

/**
 * Get a single garden, if it exists and is listed. Returns `null` otherwise.
 * @param id  the garden id
 */
export const getGarden = async (id: string) => {
  const gardenDoc = await getDoc(
    doc(collection(db(), CAMPSITES) as CollectionReference<FirebaseGarden>, id)
  );
  const data = gardenDoc.data()!;
  if (gardenDoc.exists() && data.listed) {
    return {
      id: gardenDoc.id,
      ...data
    } satisfies Garden;
  } else {
    return null;
  }
};

// Presumably, doubles and integers are the only numbers allowed:
// https://firebase.google.com/docs/firestore/manage-data/data-types
type DoubleValue = {
  doubleValue: number;
};

type IntegerValue = {
  integerValue: number;
};

type StringValue = {
  stringValue: string;
};

type BooleanValue = {
  booleanValue: boolean;
};

type MapValue = {
  mapValue: {
    fields: {
      [key: string]: StringValue | BooleanValue | DoubleValue | IntegerValue;
    };
  };
};

type RESTGardenDoc = {
  document: {
    /**
     * Path
     */
    name: string;
    fields: {
      name: StringValue;
      description: StringValue;
      location: MapValue;
      listed: BooleanValue;
      facilities: MapValue;
      photo: StringValue;
      owner: StringValue;
      createTime: string;
      updateTime: string;
    };
    createTime: string;
    updateTime: string;
  };
  /**
   * ISO string
   */
  readTime: string;
};

function mapRestToGarden(doc: RESTGardenDoc): Garden {
  const { name, fields } = doc.document;
  const { description, location, listed, facilities, photo } = fields;

  return {
    id: name.split('/').pop() as string,
    description: description?.stringValue,
    location: {
      // Integer values are rare, but we have one in the db at the time of writing,
      // with two integer values. It looks like a real location!
      //
      // The MapBox forward geocoding API we use indeed doesn't document its precision
      // and only specifies "number", which could be floating-point or integer.
      // https://docs.mapbox.com/api/search/geocoding/#geocoding-response-object
      latitude:
        location.mapValue.fields.latitude?.doubleValue ??
        location.mapValue.fields.latitude?.integerValue,
      longitude:
        location.mapValue.fields.longitude?.doubleValue ??
        location.mapValue.fields.longitude?.integerValue
    },
    listed: listed.booleanValue,
    facilities: {
      // Map facilities fields to boolean values
      // Assuming all facilities are stored as boolean values or integer values
      ...Object.fromEntries(
        Object.entries(facilities.mapValue.fields).map(([key, value]) => [
          key,
          typeof value.booleanValue !== 'undefined' ? value.booleanValue : +value.integerValue
        ])
      )
    },
    photo: photo?.stringValue
  };
}

export const getAllListedGardens = async () => {
  const CHUNK_SIZE = 1500;
  // To prevent endless loops in case of unexpected problems or bugs
  // Note: this leads to the loop breaking once this number of gardens is reached!
  const LOOP_LIMIT_ITEMS = 100000;

  console.log('Starting to fetch all gardens...');
  isFetchingGardens.set(true);

  let startAfterDocRef = null;
  let iteration = 1;
  do {
    iteration++;

    const url = `${
      // Change the REST API base URL depending on the environment
      import.meta.env.VITE_FIREBASE_PROJECT_ID === 'demo-test'
        ? 'http://127.0.0.1:8080/v1/projects/'
        : 'https://firestore.googleapis.com/v1/projects/'
    }${import.meta.env.VITE_FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
    // Query the chunk of gardens using the REST api
    const gardensChunkResponse = (await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        structuredQuery: {
          from: [
            {
              collectionId: 'campsites',
              allDescendants: false
            }
          ],
          where: {
            fieldFilter: {
              field: {
                fieldPath: 'listed'
              },
              op: 'EQUAL',
              value: {
                booleanValue: true
              }
            }
          },
          limit: CHUNK_SIZE,
          // https://stackoverflow.com/a/71812269/4973029
          orderBy: [
            {
              direction: 'ASCENDING',
              field: { fieldPath: '__name__' }
            }
          ],
          ...(startAfterDocRef
            ? {
                startAt: {
                  before: false,
                  values: [{ referenceValue: startAfterDocRef }]
                }
              }
            : {})
        }
      })
    }).then((r) => r.json())) as RESTGardenDoc[];

    // Query the chunk of gardens
    if (gardensChunkResponse.length === CHUNK_SIZE) {
      // If a full chunk was fetched, there might be more gardens to fetch
      startAfterDocRef = gardensChunkResponse[gardensChunkResponse.length - 1].document.name;
    } else {
      // If the chunk was not full, there are no more gardens to fetch
      startAfterDocRef = null;
    }

    // Merge the map with the existing gardens, "in place"
    allListedGardens.update((existingGardens) => {
      // Merge the fetched gardens with the existing ones; without creating a new array in memory
      // (attempt to reduce memory usage)
      gardensChunkResponse.forEach((restDoc) => {
        if (restDoc.document) {
          // If the document has contents. This is normally the case, but on an empty
          // local dev env, it might not be (there may be one document with only a read time, but no contents then).
          existingGardens.push(mapRestToGarden(restDoc));
        }
      });
      return existingGardens;
    });
  } while (startAfterDocRef != null && iteration < LOOP_LIMIT_ITEMS / CHUNK_SIZE);

  console.log('Fetched all gardens');

  isFetchingGardens.set(false);
  return get(allListedGardens);
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
  // Optimistic update before the update streams back in
  // Note that the caller of this function will add the garden to the allGardens store
  currentUser.setGarden(gardenWithId);
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
  // Optimistic update before the update streams back in
  // TODO: this might not be necessary anymore, depends on whether the updateDoc
  // snaphost listeners handle the update synchronously
  getUser().setGarden(gardenWithId);
  return gardenWithId;
};

/**
 * Changes the listed status of the garden in Firebase
 * @param shouldBeListed
 */
export const changeListedStatus = async (shouldBeListed: boolean) => {
  const currentUser = getUser();
  if (!currentUser.id) throw new Error('User is not logged in.');

  const docRef = doc(db(), CAMPSITES, currentUser.id);
  await updateDoc(docRef, { listed: shouldBeListed });
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
      console.error(error);
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

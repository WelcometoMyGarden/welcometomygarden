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
import { getUser } from '$lib/stores/auth';
import { isUploading, uploadProgress, allGardens, isFetchingGardens } from '$lib/stores/garden';
import { supabase } from '$lib/stores/auth';
import { appCheck, db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import type { Garden, GardenFacilities, GardenWithPhoto } from '$lib/types/Garden';
import { get } from 'svelte/store';
import { getToken } from 'firebase/app-check';

/**
 * Get a single garden, if it exists and is listed. Returns `null` otherwise.
 * @param id  the garden id
 */
export const getGarden = async (id: string) => {
  const gardenDoc = await getDoc(
    doc(collection(db(), CAMPSITES) as CollectionReference<Garden>, id)
  );
  const data = gardenDoc.data()!;
  if (gardenDoc.exists() && data.listed) {
    return {
      id: gardenDoc.id,
      ...data
    };
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

  let appCheckTokenResponse;
  try {
    // Use AppCheck if it is initialized (not on localhost development, for example)
    if (typeof import.meta.env.VITE_FIREBASE_APP_CHECK_PUBLIC_KEY !== 'undefined') {
      appCheckTokenResponse = await getToken(appCheck(), /* forceRefresh= */ false);
    }
  } catch (err) {
    // Handle any errors if the token was not retrieved.
    console.error('Error fetching app check token:', err);
    return;
  }

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
      ...(appCheckTokenResponse
        ? {
            headers: {
              'X-Firebase-AppCheck': appCheckTokenResponse.token
            }
          }
        : {}),
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
    allGardens.update((existingGardens) => {
      // Merge the fetched gardens with the existing ones; without creating a new array in memory
      // (attempt to reduce memory usage)
      gardensChunkResponse.forEach((restDoc) => {
        existingGardens.push(mapRestToGarden(restDoc));
      });
      return existingGardens;
    });
  } while (startAfterDocRef != null && iteration < LOOP_LIMIT_ITEMS / CHUNK_SIZE);

  console.log('Fetched all gardens');

  isFetchingGardens.set(false);
  return get(allGardens);
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

export const addGarden = async ({
  photo,
  facilities,
  ...rest
}: {
  photo: File;
  facilities: GardenFacilities;
}) => {
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
    facilities: facilitiesCopy,
    listed: true,
    photo: uploadedName
  };

  await setDoc(doc(db(), CAMPSITES, currentUser.id), garden);

  const gardenWithId = { ...garden, id: currentUser.id };
  currentUser.setGarden(gardenWithId);
  return gardenWithId;
};

export const updateGarden = async ({ photo, ...rest }: { photo: File; facilities }) => {
  const currentUser = getUser();
  if (!currentUser.id) throw new Error('User is not logged in.');

  let uploadedName = null;
  if (photo) uploadedName = await doUploadGardenPhoto(photo, currentUser);

  const facilities = Object.keys(rest.facilities).reduce((all, facility) => {
    all[facility] = rest.facilities[facility] || false;
    return all;
  }, {});

  const garden = {
    ...rest,
    facilities,
    previousPhotoId: null
  };

  if (uploadedName || rest.photo) garden.photo = uploadedName || rest.photo;

  const docRef = doc(db(), CAMPSITES, currentUser.id);

  await updateDoc(docRef, garden);

  const gardenWithId = { ...garden, id: currentUser.id };
  getUser().setGarden(gardenWithId);
  return gardenWithId;
};

export const changeListedStatus = async (shouldBeListed: boolean) => {
  const currentUser = getUser();
  if (!currentUser.id) throw new Error('User is not logged in.');

  const docRef = doc(db(), CAMPSITES, currentUser.id);
  await updateDoc(docRef, { listed: shouldBeListed });
};

const getPhotoBySize = async (size: string, garden: GardenWithPhoto) => {
  const photoLocation = `gardens/${garden.id}/garden_${size}.${garden.photo.split('.').pop()}`;
  const photoRef = ref(storage(), photoLocation);

  return await getDownloadURL(photoRef);
};

export const getGardenPhotoSmall = async (garden: GardenWithPhoto) => {
  return await getPhotoBySize('360x360', garden);
};

export const getGardenPhotoBig = async (garden: GardenWithPhoto) => {
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

type ResponseRateTimeResponse = {
  requests_count: number;
  last_10_responded_count_7d: number;
  median_response_time: number;
  average_response_time: number;
};

export type ResponseTime = {
  responseTime: number;
  unit: 'hour' | 'day';
};

export type ResponseRateTime =
  | { hasRequests: false; requestsCount: 0 }
  | {
      hasRequests: true;
      requestsCount: number;
      moreThan10Requests: boolean;
      last10RespondedCount: number;
      /**
       * Response rate as a fraction
       */
      responseRate: number;
      medianResponseTime: ResponseTime;
      averageResponseTime: ResponseTime;
    };

export const getGardenResponseRate = async (gardenId: string) => {
  let responseRateTimeData: ResponseRateTime;
  if (get(supabase)) {
    // https://supabase.com/docs/reference/javascript/typescript-support#helper-types-for-tables-and-joins
    const { error, data } = await get(supabase)!
      .from('response_rate_time')
      .select(
        'requests_count,last_10_responded_count_7d,median_response_time,average_response_time'
      )
      .eq('host', gardenId)
      .overrideTypes<Array<ResponseRateTimeResponse>>();
    if (error) {
      console.error(error);
    } else {
      const rrTResult = (data ?? [])[0];
      if (!rrTResult) {
        responseRateTimeData = { requestsCount: 0, hasRequests: false };
      } else {
        const {
          requests_count: requestsCount,
          last_10_responded_count_7d: last10RespondedCount,
          median_response_time: medianResponseTime,
          average_response_time: averageResponseTime
        } = rrTResult;
        const moreThan10Requests = requestsCount > 10;
        // Calc response rate
        let responseRate;
        if (requestsCount >= 3) {
          responseRate = last10RespondedCount / (moreThan10Requests ? 10 : requestsCount);
        } else {
          // virtual replies
          // e.g.
          // if the host got 1 request and did not respond, it will be 3 - 1 = 2 virtual positives + 1 real negative (0) / 3 = 2/3
          // if the host got 2 requests and did respond to one, it will be 3-2 = 1 virtual positive + 1 real positive (1) / 3 = 1/3
          responseRate = (3 - requestsCount + last10RespondedCount) / 3;
        }

        function calcResponseTime(seconds: number): ResponseTime {
          // Calc response time
          if (seconds < 1800) {
            return { responseTime: 1, unit: 'hour' };
          } else if (seconds < 24 * 3600) {
            return { responseTime: Math.round(seconds / 3600), unit: 'hour' };
          }
          return { responseTime: Math.round(seconds / (24 * 3600)), unit: 'day' };
        }
        responseRateTimeData = {
          hasRequests: true,
          requestsCount,
          moreThan10Requests,
          last10RespondedCount,
          responseRate,
          medianResponseTime: calcResponseTime(medianResponseTime),
          averageResponseTime: calcResponseTime(averageResponseTime)
        };
        return responseRateTimeData;
      }
    }
  }
  return null;
};

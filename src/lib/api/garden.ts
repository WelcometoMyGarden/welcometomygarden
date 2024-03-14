import type { User } from '$lib/models/User';
import { CAMPSITES } from './collections';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  getDocFromCache,
  getDocFromServer,
  getDoc,
  CollectionReference,
  limit,
  startAfter
} from 'firebase/firestore';
import { getUser } from '$lib/stores/auth';
import { isUploading, uploadProgress, allGardens, isFetchingGardens } from '$lib/stores/garden';
import { appCheck, db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import type { Garden, GardenFacilities } from '$lib/types/Garden';
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
      latitude: location.mapValue.fields.latitude?.doubleValue,
      longitude: location.mapValue.fields.longitude?.doubleValue
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
  const CHUNK_SIZE = 5000;
  // To prevent endless loops in case of unexpected problems or bugs
  // Note: this leads to the loop breaking once this number of gardens is reached!
  const LOOP_LIMIT_ITEMS = 100000;

  console.log('starting to fetch all gardens...');

  isFetchingGardens.set(true);

  let appCheckTokenResponse;
  try {
    appCheckTokenResponse = await getToken(appCheck(), /* forceRefresh= */ false);
  } catch (err) {
    // Handle any errors if the token was not retrieved.
    return;
  }

  // Include the App Check token with requests to your server.
  const apiResponse = (await fetch(
    `https://firestore.googleapis.com/v1/projects/${
      import.meta.env.VITE_FIREBASE_PROJECT_ID
    }/databases/(default)/documents:runQuery`,
    {
      headers: {
        'X-Firebase-AppCheck': appCheckTokenResponse.token
      },
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
          }
          // limit: 100
        }
      })
    }
  ).then((r) => r.json())) as { document: RESTGardenDoc }[];

  const gardens = apiResponse.map(mapRestToGarden);
  // NOTE: not doing update anymore
  allGardens.set(gardens);

  // let startAfterDoc = null;
  // let iteration = 1;
  // do {
  //   iteration++;
  //   // Query the chunk of gardens
  //   const q = query.apply(null, [
  //     collection(db(), CAMPSITES),
  //     where('listed', '==', true),
  //     limit(CHUNK_SIZE),
  //     ...(startAfterDoc ? [startAfter(startAfterDoc)] : [])
  //   ]);
  //   const querySnapshot = await getDocs(q);

  //   if (querySnapshot.size === CHUNK_SIZE) {
  //     // If a full chunk was fetched, there might be more gardens to fetch
  //     startAfterDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
  //   } else {
  //     // If the chunk was not full, there are no more gardens to fetch
  //     startAfterDoc = null;
  //   }

  //   // Merge the map with the existing gardens
  //   allGardens.update((existingGardens) => {
  //     querySnapshot.forEach((doc) => {
  //       const data = doc.data();
  //       existingGardens.push({
  //         id: doc.id,
  //         ...data
  //       });
  //     });
  //     return existingGardens;
  //   });

  //   // Wait 1000ms seconds before fetching the next chunk
  //   // await new Promise<void>((resolve) => setTimeout(() => resolve()));
  // } while (startAfterDoc != null && iteration < LOOP_LIMIT_ITEMS / CHUNK_SIZE);

  // console.log('Fetched all gardens!');

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

const getPhotoBySize = async (size: string, garden: Garden & { photo: string }) => {
  const photoLocation = `gardens/${garden.id}/garden_${size}.${garden.photo.split('.').pop()}`;
  const photoRef = ref(storage(), photoLocation);

  return await getDownloadURL(photoRef);
};

export const getGardenPhotoSmall = async (garden: Garden & { photo: string }) => {
  return await getPhotoBySize('360x360', garden);
};

export const getGardenPhotoBig = async (garden: Garden & { photo: string }) => {
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

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
  CollectionReference
} from 'firebase/firestore';
import { getUser } from '$lib/stores/auth';
import { isUploading, uploadProgress, allGardens, isFetchingGardens } from '$lib/stores/garden';
import { db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import type { Garden, GardenFacilities } from '$lib/types/Garden';

/**
 * Get a single garden, if it exists and is listed. Returns `null` otherwise.
 * @param id  the garden id
 */
export const getGarden = async (id: string) => {
  const gardenDoc = await getDoc(
    doc(collection(db(), CAMPSITES) as CollectionReference<Garden>, id)
  );
  let data = gardenDoc.data()!;
  if (gardenDoc.exists() && data.listed) {
    return {
      id: gardenDoc.id,
      ...data
    };
  } else {
    return null;
  }
};

export const getAllListedGardens = async () => {
  isFetchingGardens.set(true);
  const q = query(collection(db(), CAMPSITES), where('listed', '==', true));
  const querySnapshot = await getDocs(q);

  const gardens: { [id: string]: Garden } = {};
  querySnapshot.forEach((doc) => {
    gardens[doc.id] = { id: doc.id, ...doc.data() };
  });
  allGardens.set(gardens);
  isFetchingGardens.set(false);
  return gardens;
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

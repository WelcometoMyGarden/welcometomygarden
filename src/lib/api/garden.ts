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
  CollectionReference,
  DocumentReference
} from 'firebase/firestore';
import { getUser } from '$lib/stores/auth';
import { isUploading, uploadProgress, allGardens, isFetchingGardens } from '$lib/stores/garden';
import { db, storage } from './firebase';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import type { FirebaseGarden, GardenToUpload, GardenWithId } from '$lib/types/Garden';

export const getAllListedGardens = async () => {
  isFetchingGardens.set(true);
  const q = query(
    collection(db(), CAMPSITES) as CollectionReference<FirebaseGarden>,
    where('listed', '==', true)
  );
  const querySnapshot = await getDocs(q);

  const gardens: { [id: string]: GardenWithId } = {};
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

export const addGarden = async ({ photo, ...rest }: GardenToUpload): Promise<GardenWithId> => {
  const currentUser = getUser();

  if (typeof photo === 'string') {
    // It can't be a string, because we're creating this garden.
    throw new Error('unexpected string in photo while creating garden');
  }
  let uploadedFileNameOrNull: string | null = null;
  if (photo) uploadedFileNameOrNull = await doUploadGardenPhoto(photo.file, currentUser);

  const garden = {
    ...rest,
    listed: true,
    photo: uploadedFileNameOrNull
  };

  await setDoc(doc(db(), CAMPSITES, currentUser.id) as DocumentReference<FirebaseGarden>, garden);

  const gardenWithId = { ...garden, id: currentUser.id };
  return gardenWithId;
};

/**
 * In case an existing photo exists, pass the string of the existing photo.
 * In case you want to delete the existing photo, pass "null" for photo
 */
export const updateGarden = async ({ photo, ...rest }: GardenToUpload): Promise<GardenWithId> => {
  const currentUser = getUser();
  if (!currentUser.id) throw new Error('User is not logged in.');

  // Copy the object, because the photo value can not be `undefined` when we update it.
  // Either it needs a value (string/null), or the key should not be present.
  const gardenUpdateObject: Omit<FirebaseGarden, 'photo'> & {
    photo?: string | null;
  } = {
    ...rest,
    previousPhotoId: null
  };

  // If a file was selected, upload it
  let uploadedFileName = null;
  if (photo && !(typeof photo === 'string'))
    uploadedFileName = await doUploadGardenPhoto(photo.file, currentUser);
  if (uploadedFileName) gardenUpdateObject.photo = uploadedFileName;

  // If the photo should be removed, remove it
  if (photo === null) {
    // TODO: will this also remove storage object? Probably not?
    // Can we overwrite?
    gardenUpdateObject.photo = null;
  }

  // If the photo is a string, it means we didn't change the existing photo
  // Don't do anything, the photo key will not be present and will not be changed.

  const docRef = doc(db(), CAMPSITES, currentUser.id);

  await updateDoc(docRef, gardenUpdateObject);

  const gardenWithId = {
    ...gardenUpdateObject,
    photo: gardenUpdateObject.photo ?? null,
    id: currentUser.id
  };
  return gardenWithId;
};

export const changeListedStatus = async (shouldBeListed: boolean) => {
  const currentUser = getUser();
  if (!currentUser.id) throw new Error('User is not logged in.');

  const docRef = doc(db(), CAMPSITES, currentUser.id);
  await updateDoc(docRef, { listed: shouldBeListed });
};

const getPhotoBySize = async (size: string, garden: GardenWithId & { photo: string }) => {
  const photoLocation = `gardens/${garden.id}/garden_${size}.${garden.photo.split('.').pop()}`;
  const photoRef = ref(storage(), photoLocation);

  return await getDownloadURL(photoRef);
};

export const getGardenPhotoSmall = async (garden: GardenWithId & { photo: string }) => {
  return await getPhotoBySize('360x360', garden);
};

export const getGardenPhotoBig = async (garden: GardenWithId & { photo: string }) => {
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

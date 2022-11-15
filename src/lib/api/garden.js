import { get } from 'svelte/store';
import { user } from '@/lib/stores/auth';
import { isUploading, uploadProgress, allGardens, isFetchingGardens } from '@/lib/stores/garden';
import { db, storage } from './index';

export const getAllListedGardens = async () => {
  isFetchingGardens.set(true);
  const snapshot = await db.collection('campsites').where('listed', '==', true).get();
  const gardens = {};
  snapshot.forEach((doc) => {
    gardens[doc.id] = { id: doc.id, ...doc.data() };
  });
  allGardens.set(gardens);
  isFetchingGardens.set(false);
  return gardens;
};

const doUploadGardenPhoto = async (photo, currentUser) => {
  const extension = photo.name.split('.').pop();
  const photoLocation = `gardens/${currentUser.id}/garden.${extension}`;
  isUploading.set(true);
  const uploadTask = storage.child(photoLocation).put(photo, { contentType: photo.type });
  uploadTask.on('state_changed', (snapshot) => {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    uploadProgress.set(progress);
  });
  await uploadTask;
  isUploading.set(false);
  return `garden.${extension}`;
};

export const addGarden = async ({ photo, ...rest }) => {
  const currentUser = get(user);

  let uploadedName = null;
  if (photo) uploadedName = await doUploadGardenPhoto(photo, currentUser);

  const facilities = Object.keys(rest.facilities).reduce((all, facility) => {
    all[facility] = rest.facilities[facility] || false;
    return all;
  }, {});

  const garden = {
    ...rest,
    facilities,
    listed: true,
    photo: uploadedName
  };

  await db.collection('campsites').doc(currentUser.id).set(garden);

  const gardenWithId = { ...garden, id: currentUser.id };
  get(user).setGarden(gardenWithId);
  return gardenWithId;
};

export const updateGarden = async ({ photo, ...rest }) => {
  const currentUser = get(user);

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

  await db.collection('campsites').doc(currentUser.id).update(garden);

  const gardenWithId = { ...garden, id: currentUser.id };
  get(user).setGarden(gardenWithId);
  return gardenWithId;
};

export const changeListedStatus = async (shouldBeListed) => {
  const currentUser = get(user);
  await db.collection('campsites').doc(currentUser.id).update({
    listed: shouldBeListed
  });
};

const getPhotoBySize = (size, garden) => {
  return storage
    .child(`gardens/${garden.id}/garden_${size}.${garden.photo.split('.').pop()}`)
    .getDownloadURL();
};

export const getGardenPhotoSmall = async (garden) => {
  return getPhotoBySize('360x360', garden);
};

export const getGardenPhotoBig = async (garden) => {
  return getPhotoBySize('1920x1080', garden);
};

export const hasGarden = async (userId) => {
  let snapshot;
  const doc = db.collection('campsites').doc(userId);
  try {
    snapshot = await doc.get({ source: 'cache' });
  } catch (error) {
    // probably not cached
    snapshot = await doc.get({ source: 'server' });
  }
  return snapshot ? snapshot.exists && snapshot.data().listed : false;
};

import { get } from 'svelte/store';
import { user } from '@/stores/auth';
import { isUploading, uploadProgress, allGardens, isFetchingGardens } from '@/stores/garden';
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
  return snapshot.docs;
};

export const addGarden = async ({ photo, ...rest }) => {
  const currentUser = get(user);

  let uploadedName = null;
  if (photo) {
    const extension = photo.name.split('.').pop();
    const photoLocation = `gardens/${currentUser.id}/garden.${extension}`;
    isUploading.set(true);
    const uploadTask = storage.child(photoLocation).put(photo, { contentType: photo.type });
    uploadTask.on('state_changed', (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      uploadProgress.set(progress);
    });
    await uploadTask;
    uploadedName = `garden.${extension}`;
    isUploading.set(false);
  }

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

  get(user).setGarden(garden);
};

export const changeListedStatus = async (shouldBeListed) => {
  const currentUser = get(user);
  await db.collection('campsites').doc(currentUser.id).update({
    listed: shouldBeListed
  });
};

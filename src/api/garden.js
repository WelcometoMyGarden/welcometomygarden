import { get } from 'svelte/store';
import { user } from '@/stores/auth';
import { isUploading, uploadProgress } from '@/stores/garden';
import { db, storage } from './index';

export const addGarden = async ({ photo, ...rest }) => {
  const userId = get(user).id;

  let uploadedName = null;
  if (photo) {
    const extension = photo.name.split('.').pop();
    const photoLocation = `gardens/${userId}/garden.${extension}`;
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

  await db
    .collection('campsites')
    .doc(userId)
    .set({
      ...rest,
      facilities,
      photo: uploadedName
    });
};

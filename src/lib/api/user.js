import { get } from 'svelte/store';
import { db } from './index';
import { user } from '@/lib/stores/auth';
import { gettingPrivateUserProfile, updatingMailPreferences } from '@/lib/stores/user';

export const getPublicUserProfile = async (uid) => {
  const profile = await db.collection('users').doc(uid).get();
  if (!profile.exists) throw new Error('This person does not have an account.');
  return profile.data();
};

const getPrivateUserProfile = async () => {
  gettingPrivateUserProfile.set(true);
  const profile = await db.collection('users-private').doc(get(user).id).get();
  get(user).setPrivateInformation(profile.data());
  gettingPrivateUserProfile.set(false);
  return profile.data();
};

const setCampsiteInformation = async () => {
  const doc = await db.collection('campsites').doc(get(user).id).get();
  if (doc.exists) get(user).setGarden(doc.data());
  else get(user).setGarden(null);
};

export const setAllUserInfo = async () => {
  await setCampsiteInformation();
  const info = await getPublicUserProfile(get(user).id);
  get(user).addFields(info);
  await getPrivateUserProfile();
};

export const updateMailPreferences = async (preferenceName, preference) => {
  updatingMailPreferences.set(true);
  await db
    .collection('users-private')
    .doc(get(user).id)
    .update({ [`emailPreferences.${preferenceName}`]: preference });
  updatingMailPreferences.set(false);
};

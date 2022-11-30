import { CAMPSITES, USERS, USERS_PRIVATE } from './collections';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { db } from './firebase';

import { getUser } from '@/lib/stores/auth';
import { gettingPrivateUserProfile, updatingMailPreferences } from '@/lib/stores/user';
import type { Garden } from '@/lib/types/Garden';

export const doesPublicUserExist = async (uid: string) => {
  const userDoc = await getDoc(doc(db(), USERS, uid));
  return userDoc.exists();
};

export const getPublicUserProfile = async (uid: string) => {
  const docRef = doc(db(), USERS, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) throw new Error('This person does not have an account.');
  return docSnap.data();
};

const getPrivateUserProfile = async () => {
  gettingPrivateUserProfile.set(true);

  const docRef = doc(db(), USERS_PRIVATE, getUser().id);

  const profile = await getDoc(docRef);
  getUser().setPrivateInformation(profile.data());
  gettingPrivateUserProfile.set(false);
  return profile.data();
};

const setCampsiteInformation = async () => {
  const docRef = doc(db(), CAMPSITES, getUser().id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) getUser().setGarden(<Garden>docSnap.data());
  else getUser().setGarden(null);
};

export const setAllUserInfo = async () => {
  const info = await getPublicUserProfile(getUser().id);
  getUser().addFields(info);
  await getPrivateUserProfile();
  await setCampsiteInformation();
};

export const updateMailPreferences = async (
  preferenceName: 'newChat' | 'news',
  preference: boolean
) => {
  updatingMailPreferences.set(true);
  const docRef = doc(db(), USERS_PRIVATE, getUser().id);

  await updateDoc(docRef, { [`emailPreferences.${preferenceName}`]: preference });

  getUser().setEmailPreferences(preferenceName, preference);
  updatingMailPreferences.set(false);
};

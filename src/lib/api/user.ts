import { CAMPSITES, USERS, USERS_PRIVATE } from './collections';
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { db } from './firebase';

import { getUser } from '@/lib/stores/auth';
import { gettingPrivateUserProfile, updatingMailPreferences } from '@/lib/stores/user';

export const getPublicUserProfile = async (uid: string) => {
  const docRef = doc(db, USERS, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) throw new Error('This person does not have an account.');;
  return docSnap.data();
};

const getPrivateUserProfile = async () => {
  gettingPrivateUserProfile.set(true);

  const docRef = doc(db, USERS_PRIVATE, getUser().id);

  const profile = await getDoc(docRef);
  getUser().setPrivateInformation(profile.data());
  gettingPrivateUserProfile.set(false);
  return profile.data();
};

const setCampsiteInformation = async () => {
  const docRef = doc(db, CAMPSITES, getUser().id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) getUser().setGarden(docSnap.data());
  else getUser().setGarden(null);
};

export const setAllUserInfo = async () => {
  await setCampsiteInformation();
  const info = await getPublicUserProfile(getUser().id);
  getUser().addFields(info);
  await getPrivateUserProfile();
};

export const updateMailPreferences = async (preferenceName: string, preference: boolean) => {
  updatingMailPreferences.set(true);
  const docRef = doc(db, USERS_PRIVATE, getUser().id);

  await updateDoc(docRef, { [`emailPreferences.${preferenceName}`]: preference });

  // TODO: check if this is necessary
  //getUser().setEmailPreference(preferenceName, preference);
  updatingMailPreferences.set(false);
};

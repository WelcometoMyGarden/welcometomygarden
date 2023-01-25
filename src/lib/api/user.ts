import { CAMPSITES, USERS, USERS_PRIVATE } from './collections';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { db } from './firebase';

import { getUser, user } from '@/lib/stores/auth';
import {
  gettingPrivateUserProfile,
  updatingMailPreferences,
  updatingSavedGardens
} from '@/lib/stores/user';
import type { Garden } from '@/lib/types/Garden';
import type { UserPrivate } from '../models/User';

export const doesPublicUserExist = async (uid: string) => {
  const userDoc = await getDoc(doc(db(), USERS, uid));
  return userDoc.exists();
};

export const getPublicUserProfile = async (uid: string) => {
  const docRef = doc(db(), USERS, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) throw new Error('This user does not have Firestore account data yet.');
  return docSnap.data();
};

export const getPrivateUserProfile = async (uid: string): Promise<UserPrivate | undefined> => {
  gettingPrivateUserProfile.set(true);

  const docRef = doc(db(), USERS_PRIVATE, uid);

  const profile = await getDoc<UserPrivate>(docRef);
  gettingPrivateUserProfile.set(false);
  return profile.data();
};

const getCampsiteInformation = async (uid: string) => {
  const docRef = doc(db(), CAMPSITES, uid);
  const docSnap = await getDoc(docRef);

  let garden = null;
  if (docSnap.exists()) garden = <Garden>docSnap.data();
  return { garden };
};

/**
 * Gets all non-id data related to the user from the user, users-private and campsite collections.
 */
export const getAllUserInfo = async (userId: string) => {
  const publicUserProfile = await getPublicUserProfile(userId);
  const privateUserProfile = await getPrivateUserProfile(userId);
  const garden = await getCampsiteInformation(userId);
  return { ...publicUserProfile, ...privateUserProfile, ...garden };
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

const updateSavedGardens = async (gardenId: string, action: 'REMOVE' | 'ADD') => {
  if (!gardenId || !action) throw new Error('Missing parameters');
  if (action !== 'REMOVE' && action !== 'ADD') throw new Error('Action is not valid.');

  updatingSavedGardens.set(true);
  const docRef = doc(db(), USERS, getUser().id);

  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error('This person does not have an account.');
  const data = docSnap.data();

  // check if user is a superfan
  //if (!data.superfan) throw new Error('This person is not a superfan.');

  // check if the user has saved gardens if not create an empty array
  const savedGardens = data.savedGardens || [];

  if (action === 'REMOVE') {
    const index = savedGardens.indexOf(gardenId);
    if (index > -1) {
      // We could use a filter here but I think this is more readable and the mutation is no concern here
      savedGardens.splice(index, 1);

      await updateDoc(docRef, { savedGardens });
      const tempUser = getUser();
      tempUser.addFields({ savedGardens });
      user.set(tempUser);
      updatingSavedGardens.set(false);
      return savedGardens;
    }
  }

  if (action === 'ADD') {
    if (!savedGardens.includes(gardenId)) {
      // the mutation is no concern here
      savedGardens.push(gardenId);

      await updateDoc(docRef, { savedGardens });
      const tempUser = getUser();
      tempUser.addFields({ savedGardens });
      user.set(tempUser);
      updatingSavedGardens.set(false);
      return savedGardens;
    }
  }
};

export const removeSavedGarden = async (gardenId: string) => {
  await updateSavedGardens(gardenId, 'REMOVE');
};
export const addSavedGarden = async (gardenId: string) => {
  await updateSavedGardens(gardenId, 'ADD');
};

export const updateSuperfan = async (superfan: boolean) => {
  const docRef = doc(db(), USERS, getUser().id);
  await updateDoc(docRef, { superfan });
  const tempUser = getUser();
  tempUser.addFields({ superfan });
  user.set(tempUser);
};

export const updateCommunicationLanguage = async (lang: string) => {
  const docRef = doc(db(), USERS_PRIVATE, getUser().id);
  await updateDoc(docRef, { communicationLanguage: lang });
  const tempUser = getUser();
  tempUser.addFields({ communicationLanguage: lang });
  user.set(tempUser);
};

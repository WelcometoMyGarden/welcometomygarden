import { USERS, USERS_PRIVATE } from './collections';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { db } from './firebase';

import { getUser } from '$lib/stores/auth';

export const doesPublicUserExist = async (uid: string) => {
  const userDoc = await getDoc(doc(db(), USERS, uid));
  return userDoc.exists();
};

/**
 * Get the public user profile of a user. Used, for example, to fetch information about a chat partner.
 */
export const getPublicUserProfile = async (uid: string) => {
  const docRef = doc(db(), USERS, uid);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) throw new Error('This user does not have Firestore account data yet.');
  return docSnap.data();
};

export const updateMailPreferences = async (
  preferenceName: 'newChat' | 'news',
  preference: boolean
) => {
  const docRef = doc(db(), USERS_PRIVATE, getUser().id);
  await updateDoc(docRef, { [`emailPreferences.${preferenceName}`]: preference });
};

const updateSavedGardens = async (gardenId: string, action: 'REMOVE' | 'ADD') => {
  if (!gardenId || !action) throw new Error('Missing parameters');
  if (action !== 'REMOVE' && action !== 'ADD') throw new Error('Action is not valid.');

  const localUser = getUser();

  // check if the user has saved gardens if not create an empty array
  const savedGardens = localUser.savedGardens || [];

  // doc ref for user updating
  const docRef = doc(db(), USERS, getUser().id);

  if (action === 'REMOVE') {
    const index = savedGardens.indexOf(gardenId);
    if (index > -1) {
      // We could use a filter here but I think this is more readable and the mutation is no concern here
      savedGardens.splice(index, 1);

      await updateDoc(docRef, { savedGardens });
      return savedGardens;
    }
  }

  if (action === 'ADD') {
    if (!savedGardens.includes(gardenId)) {
      // the mutation is no concern here
      savedGardens.push(gardenId);

      await updateDoc(docRef, { savedGardens });
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

export const updateCommunicationLanguage = async (lang: string) => {
  const localUser = getUser();
  const docRef = doc(db(), USERS_PRIVATE, localUser.id);
  await updateDoc(docRef, { communicationLanguage: lang });
};

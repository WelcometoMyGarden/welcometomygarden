import { get } from 'svelte/store';
import {
  applyActionCode as firebaseApplyActionCode,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  type Unsubscribe,
  confirmPasswordReset as firebaseConfirmPasswordReset
} from 'firebase/auth';
import { auth, db } from './firebase';
import { isLoggingIn, isRegistering, user, isInitializing, getUser } from '$lib/stores/auth';
import User from '$lib/models/User';
import { createUser, resendAccountVerification as resendAccVerif } from '@/lib/api/functions';
import { getAllUserInfo } from './user';
import { USERS, USERS_PRIVATE } from './collections';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * Creates Firebase observers that manage the app's User model.
 */
export const createAuthObserver = (): Unsubscribe => {
  let unsubscribeFromUserPrivate: (() => void) | null = null;
  let unsubscribeFromUserPublic: (() => void) | null = null;

  const unsubscribeFromAuthObserver = auth().onAuthStateChanged(async (userData) => {
    // Reset subscriptions
    if (unsubscribeFromUserPrivate) unsubscribeFromUserPrivate()
    if (unsubscribeFromUserPublic) unsubscribeFromUserPublic()

    // If logged in
    if (userData) {
      // Reload the user
      const user = await reloadUserInfo();
      if (user) {
        // Re-subscribe to dependent observers
        unsubscribeFromUserPrivate = await createUserPrivateObserver(user.id);
        unsubscribeFromUserPublic = await createUserPublicObserver(user.id);
      }
    } else {
      // If the user somehow got logged out by Firebase, sync this change to the app.
      // (e.g. their password was reset elsewhere)
      const localUserState = get(user)
      if (localUserState) {
        user.set(null)
      }
    }

    isInitializing.set(false);
  });

  // Unsubscribe from all related observers
  return () => {
    if (unsubscribeFromUserPrivate) unsubscribeFromUserPrivate()
    unsubscribeFromAuthObserver()
  }
};

/**
 * Actively reload user info, in case the user is logged in.
 * Note: when looking for user-private data changes, just subscribe to the user.
 * user-private snapshots are being listened to.
 * @returns the reloaded user if the user was signed in, otherwise null.
 */
const reloadUserInfo = async (): Promise<User | null> => {
  await auth().currentUser?.reload();

  // Check if there is a user logged in
  const firebaseUser = auth().currentUser;
  if (!firebaseUser) {
    console.warn("Trying to reload user info while logged out");
    return null;
  }

  try {
    const userInfo = await getAllUserInfo(firebaseUser.uid)
    const { email, emailVerified, uid } = firebaseUser;
    const newUser = new User({
      ...userInfo,
      email: email || undefined,
      emailVerified: emailVerified,
      id: uid
    }
      );
    user.set(newUser);
    return newUser
  } catch (ex) {
    console.log(ex);
  }
  return null
};

export const createUserPublicObserver = async (currentUserId: string) => {
  const docRef = doc(db(), USERS, currentUserId);
  return onSnapshot(docRef, (doc) => {
    const newUserData = doc.data();
    if (newUserData) {
      const newUser = getUser().copyWith(newUserData)
      user.set(newUser);
    }
  })
}

export const createUserPrivateObserver = async (currentUserId: string) => {
  const docRef = doc(db(), USERS_PRIVATE, currentUserId);
  return onSnapshot(docRef, (doc) => {
    const newUserPrivateData = doc.data();
    if (newUserPrivateData) {
      const newUser = getUser().copyWith(newUserPrivateData)
      user.set(newUser);
    }
  })
}

export const login = async (email: string, password: string): Promise<void> => {
  isLoggingIn.set(true);
  await signInWithEmailAndPassword(auth(), email, password);
  // TODO: refactor this
  // You don't need 'await reloadUserInfo();' here because the auth observer will trigger "reloadUserInfo()" (because the user is logged in)
  // Jokes on me, we do need it because the we return the promise of this function before the auth observer is completed
  // so yes the reloadUserInfo() is called here and in the auth observer after, so it's called twice, but it's not a big deal
  await reloadUserInfo();
  isLoggingIn.set(false);
};

export const register = async ({
  email,
  password,
  firstName,
  lastName,
  countryCode
}: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  countryCode: string;
}) => {
  isRegistering.set(true);
  // TODO: refactor
  // createUserWithEmailAndPassword triggers the onAuthStateChanged listener, with limited user data and the firebase docs are not yet created, so we expect the error "'This person does not have an account.'" and reload the user data after the user is created
  await createUserWithEmailAndPassword(auth(), email, password);
  await createUser({ firstName, lastName, countryCode });
  // this reloads the user data with the full user data from the firebase docs
  await reloadUserInfo();
  isRegistering.set(false);
};

export const logout = async () => {
  await auth().signOut();
  await auth().currentUser?.reload();
  if (auth().currentUser) {
    throw new Error("Log out failed")
  }
  user.set(null);
};

export const applyActionCode = async (code: string) => {
  await firebaseApplyActionCode(auth(), code);
  await auth().currentUser?.getIdToken(true);
  await reloadUserInfo();
};

export const resendAccountVerification = async () => {
  if (!get(user)) throw 'Please sign in first';
  if (get(user)?.emailVerified) throw 'Your email is already verified. Please refresh the page.';
  return await resendAccVerif();
};

export const verifyPasswordResetCode = (code: string) => {
  return firebaseVerifyPasswordResetCode(auth(), code);
};

export const confirmPasswordReset = (code: string, password: string) => {
  return firebaseConfirmPasswordReset(auth(), code, password);
};

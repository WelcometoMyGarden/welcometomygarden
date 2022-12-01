import { get } from 'svelte/store';
import {
  applyActionCode as firebaseApplyActionCode,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
  type Unsubscribe,
  confirmPasswordReset as firebaseConfirmPasswordReset
} from 'firebase/auth';
import { auth } from './firebase';
import { isLoggingIn, isRegistering, user, isInitializing } from '$lib/stores/auth';
import User from '$lib/models/User';
import { createUser, resendAccountVerification as resendAccVerif } from '@/lib/api/functions';
import { getAllUserInfo } from './user';

const reloadUserInfo = async (): Promise<void> => {
  await auth().currentUser?.reload();

  // Check if there is a user logged in
  if (!auth().currentUser) return;

  let tempUser = new User(auth().currentUser);
  tempUser.addFields(await getAllUserInfo(tempUser.uid));

  user.set(tempUser);
};

export const login = async (email: string, password: string): Promise<void> => {
  isLoggingIn.set(true);
  await signInWithEmailAndPassword(auth(), email, password);
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
  await createUserWithEmailAndPassword(auth(), email, password);
  await createUser({ firstName, lastName, countryCode });
  await reloadUserInfo();
  isRegistering.set(false);
};

export const logout = async () => {
  await auth().signOut();
  await auth().currentUser?.reload();
  user.set(null);
};

export const createAuthObserver = (): Unsubscribe => {
  return auth().onAuthStateChanged(async (userData) => {
    if (userData) await reloadUserInfo();
    isInitializing.set(false);
  });
};

export const resendAccountVerification = async () => {
  if (!get(user)) throw 'Please sign in first';
  if (get(user)?.emailVerified) throw 'Your email is already verified. Please refresh the page.';
  return await resendAccVerif();
};

export const verifyPasswordResetCode = (code: string) => {
  return firebaseVerifyPasswordResetCode(auth(), code);
};

export const applyActionCode = async (code: string) => {
  await firebaseApplyActionCode(auth(), code);
  await auth().currentUser?.getIdToken(true);
  await reloadUserInfo();
};

export const confirmPasswordReset = (code: string, password: string) => {
  return firebaseConfirmPasswordReset(auth(), code, password);
};

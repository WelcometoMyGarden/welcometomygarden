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
import { createUser, requestPasswordReset as reqPasswordReset, resendAccountVerification as resendAccVerif } from '@/lib/api/functions';

const reloadUserInfo = async (): Promise<void> => {
  await auth.currentUser?.reload();
  user.set(new User(auth.currentUser));
};

export const login = async (email: string, password: string): Promise<void> => {
  isLoggingIn.set(true);
  await signInWithEmailAndPassword(auth, email, password);
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
  const userCreds = await createUserWithEmailAndPassword(auth, email, password);
  const createUserResult = await createUser({ firstName, lastName, countryCode });
  await reloadUserInfo();
  isRegistering.set(false);
};

export const logout = async () => {
  isInitializing.set(true);
  await auth.signOut();
  await auth.currentUser?.reload();
  user.set(null);
  isInitializing.set(false);
};

export const requestPasswordReset = async (email: string) => await reqPasswordReset(email);

export const createAuthObserver = (): Unsubscribe =>
  auth.onAuthStateChanged(async (userData) => {
    if (!userData) user.set(null);
    else user.set(new User(userData));
    isInitializing.set(false);
  });

export const resendAccountVerification = async () => {
  if (!get(user)) throw 'Please sign in first';
  if (get(user)?.emailVerified) throw 'Your email is already verified. Please refresh the page.';
  return await resendAccVerif();
};

export const verifyPasswordResetCode = (code: string) =>
  firebaseVerifyPasswordResetCode(auth, code);

export const applyActionCode = async (code: string) => {
  await firebaseApplyActionCode(auth, code);
  await auth.currentUser?.getIdToken(true);
  await reloadUserInfo();
};

export const confirmPasswordReset = (code: string, password: string) =>
  firebaseConfirmPasswordReset(auth, code, password);

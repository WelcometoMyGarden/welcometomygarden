import { get } from 'svelte/store';
import { auth } from './index';
import * as api from './functions';
import { isLoggingIn, isRegistering, user, isInitializing } from '../stores/auth';
import User from '@/models/User';

const reloadUserInfo = async () => {
  await auth.currentUser.reload();
  user.set(new User(auth.currentUser));
};

export const login = async (email, password) => {
  isLoggingIn.set(true);
  await auth.signInWithEmailAndPassword(email, password);
  await reloadUserInfo();
  isLoggingIn.set(false);
};

export const register = async ({ email, password, firstName, lastName, countryCode }) => {
  isRegistering.set(true);
  await auth.createUserWithEmailAndPassword(email, password);
  await api.createUser({ firstName, lastName, countryCode });
  await reloadUserInfo();
  isRegistering.set(false);
};

export const logout = async () => {
  isInitializing.set(true);
  await auth.signOut();
  user.set(null);
  isInitializing.set(false);
};

export const requestPasswordReset = (email) => api.requestPasswordReset(email);

export const createAuthObserver = () =>
  auth.onAuthStateChanged(async (userData) => {
    if (!userData) user.set(null);
    else user.set(new User(userData));
    isInitializing.set(false);
  });

export const resendAccountVerification = () => {
  if (!get(user)) throw 'Please sign in first';
  if (get(user).emailVerified) throw 'Your email is already verified. Please refresh the page.';
  return api.resendAccountVerification();
};
export const verifyPasswordResetCode = (code) => auth.verifyPasswordResetCode(code);
export const applyActionCode = async (code) => {
  await auth.applyActionCode(code);
  await auth.currentUser.getIdToken(true);
  await reloadUserInfo();
};
export const confirmPasswordReset = (code, password) => auth.confirmPasswordReset(code, password);

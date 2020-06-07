import { writable } from 'svelte/store';
import { auth } from '../firebase';
import * as api from '../firebase/api';
import User from '../models/User';

export const isLoggingIn = writable(true);
export const login = (email, password) => {
  isLoggingIn.set(true);
  return auth.signInWithEmailAndPassword(email, password).then(() => {
    isLoggingIn.set(false);
  });
};

export const isRegistering = writable(false);
export const register = async ({ email, password, firstName, lastName, countryCode }) => {
  isRegistering.set(true);
  await auth.createUserWithEmailAndPassword(email, password);
  await api.createUser({ firstName, lastName, countryCode });
};

export const logout = () => auth.signOut();

export const requestPasswordReset = (email) => api.requestPasswordReset(email);

export const user = writable(null);
auth.onAuthStateChanged((userData) => {
  isLoggingIn.set(false);
  if (!userData) user.set(null);
  else user.set(new User(userData));
});

export const updateEmail = (email) => {
  if (!auth.currentUser) throw new Error('You are not logged in.');
  return auth.currentUser.updateEmail(email);
};

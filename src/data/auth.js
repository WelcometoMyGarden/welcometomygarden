import { writable } from 'svelte/store';
import { auth } from './firebase';

export const isLoggingIn = writable(false);
export const user = writable(null);
export const login = (email, password) => {
  isLoggingIn.set(true);
  return auth.signInWithEmailAndPassword(email, password).then(() => {
    isLoggingIn.set(false);
  });
};

export const isRegistering = writable(false);
export const register = (email, password) => {
  isRegistering.set(true);
  return auth.createUserWithEmailAndPassword(email, password).then(() => {
    isRegistering.set(false);
  });
};

auth.onAuthStateChanged(async (userData) => {
  if (!userData) user.set(null);
  else user.set(userData);
});

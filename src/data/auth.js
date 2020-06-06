import { writable } from 'svelte/store';
import { auth } from '../firebase';
import { createUser } from '../firebase/api';

export const isLoggingIn = writable(false);
export const login = (email, password) => {
  isLoggingIn.set(true);
  return auth.signInWithEmailAndPassword(email, password).then(() => {
    isLoggingIn.set(false);
  });
};

export const isRegistering = writable(false);
export const register = async (email, password) => {
  isRegistering.set(true);
  await auth.createUserWithEmailAndPassword(email, password);
  await createUser('Michiel', 'Leyman');
};

export const logout = () => auth.signOut();

export const user = writable(null);
auth.onAuthStateChanged((userData) => {
  if (!userData) user.set(null);
  else user.set(userData);
});

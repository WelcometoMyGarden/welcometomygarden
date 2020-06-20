import { get, writable } from 'svelte/store';
import User from '@/models/User';

export const isInitializing = writable(true);
export const isLoggingIn = writable(false);
export const isRegistering = writable(false);
export const user = writable(null);

export const addUserInfo = (info) => {
  user.set(new User({ ...get(user), ...info }));
};

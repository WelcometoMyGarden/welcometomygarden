import { get, writable } from 'svelte/store';
import { user } from './auth';

export const gettingPrivateUserProfile = writable(false);
export const updatingMailPreferences = writable(false);

export const addUserInfo = (info) => {
  get(user).addFields(info);
};

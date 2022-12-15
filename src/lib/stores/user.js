import { writable } from 'svelte/store';

export const gettingPrivateUserProfile = writable(false);
export const updatingMailPreferences = writable(false);
export const updatingSavedGardens = writable(false);

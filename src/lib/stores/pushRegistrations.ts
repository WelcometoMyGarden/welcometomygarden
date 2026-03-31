import type { LocalPushRegistration, PushSubscriptionPOJO } from '$lib/types/PushRegistration';
import { writable } from 'svelte/store';

export const pushRegistrations = writable<LocalPushRegistration[]>([]);
export const loadedPushRegistrations = writable(false);

export const isEnablingLocalPushRegistration = writable<boolean>(false);
export const currentWebPushSubStore = writable<PushSubscriptionPOJO | null>(null);
/**
 * undefined if not loaded yet
 * null if the current device is not native
 */
export const deviceId = writable<string | null | undefined>(undefined);

/**
 * Updated when the local native registration is acquired.
 */
export const localNativeRegistrationFCMToken = writable<null | string>(null);

export const resetPushRegistrationStores = () => {
  pushRegistrations.set([]);
  loadedPushRegistrations.set(false);
};

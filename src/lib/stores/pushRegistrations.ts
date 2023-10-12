import type { LocalPushRegistration } from '$lib/types/PushRegistration';
import type { PushSubscriptionPOJO } from '$lib/api/push-registrations';
import { writable } from 'svelte/store';

export const pushRegistrations = writable<LocalPushRegistration[]>([]);
export const loadedPushRegistrations = writable(false);

export const isEnablingLocalPushRegistration = writable<boolean>(false);
export const currentNativeSubStore = writable<PushSubscriptionPOJO | null>(null);

export const resetPushRegistrationStores = () => {
  pushRegistrations.set([]);
  loadedPushRegistrations.set(false);
};

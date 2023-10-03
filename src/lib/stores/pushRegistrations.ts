import type { LocalPushRegistration } from '$lib/types/PushRegistration';
import { writable } from 'svelte/store';

export const pushRegistrations = writable<LocalPushRegistration[]>([]);
export const loadedPushRegistrations = writable(false);

export const resetPushRegistrationStores = () => {
  pushRegistrations.set([])
  loadedPushRegistrations.set(false)
}

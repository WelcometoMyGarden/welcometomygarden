import type { LocalPushRegistration } from '$lib/types/PushRegistration';
import { writable } from 'svelte/store';

export const pushRegistrations = writable<LocalPushRegistration[]>([]);

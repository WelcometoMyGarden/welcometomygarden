import { writable } from 'svelte/store';

export const isInitializing = writable(true);
export const isLoggingIn = writable(false);
export const isRegistering = writable(false);
export const user = writable(null);

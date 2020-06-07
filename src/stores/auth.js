import { writable } from 'svelte/store';

const isInitializing = writable(true);
const isLoggingIn = writable(false);
const isRegistering = writable(false);
const user = writable(null);

export { isInitializing, isLoggingIn, isRegistering, user };

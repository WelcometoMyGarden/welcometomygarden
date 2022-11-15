import type { User } from '@/lib/models/User';
import { writable, type Writable } from 'svelte/store';

export const isInitializing = writable(true);
export const isLoggingIn = writable(false);
export const isRegistering = writable(false);
export const user: Writable<User | null> = writable(null);

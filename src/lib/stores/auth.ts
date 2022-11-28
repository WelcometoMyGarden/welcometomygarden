import type { User } from '@/lib/models/User';
import { get, writable, type Writable } from 'svelte/store';

export const isInitializing = writable(true);
export const isLoggingIn = writable(false);
export const isRegistering = writable(false);
export const user: Writable<User | null> = writable(null);

export const getUser = (): User => {
  const localUser = get(user);
  if (!localUser || !localUser.id) throw new Error('User is not logged in.');
  return localUser;
}



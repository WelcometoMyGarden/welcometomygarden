import type { User } from '$lib/models/User';
import { get, writable, type Writable } from 'svelte/store';

/**
 * Reflects whether when Firebase's services are fully loaded
 * Does not guarantee that the User state is fully loaded via snapshot listeners (see isUserLoading)
 * but guarantees that the auth observer is set up, and that
 * a persisted auth login happened if one was available.
 */
export const isInitializingFirebase = writable(true);
export const isRegistering = writable(false);

/** This helps the app to know when a user is fully loaded,
 * `!get(user) && !get(userIsLoading)` *in pages below the root layout*
 * means that we are sure that the user is logged out (and not just still loading)
 * since we only update the user when all parts are loaded.
 *
 * Starts as false, because onIdTokenChanged sets it to true.
 */
export const isUserLoading = writable(false);
export const user: Writable<User | null> = writable(null);

export const appCheckToken = writable<string | null>(null);

/**
 * Note: this assumes that isUserLoading.set(true) was called synchronously before invoking this function.
 */
export const resolveOnUserLoaded = async () => {
  // Guard is necesary, because if !isUserLoading, the reference
  // to unsubFromLoading won't be created
  if (get(isUserLoading)) {
    return new Promise<void>((resolve) => {
      const unsubFromLoading = isUserLoading.subscribe((isLoading) => {
        if (!isLoading) {
          unsubFromLoading();
          resolve();
        }
      });
    });
  }
  return Promise.resolve();
};

export const getUser = (): User => {
  const localUser = get(user);
  if (!localUser || !localUser.id) throw new Error('User is not logged in.');
  return localUser;
};

// Sign-in values
// To be shared between their common fields in the log-in and register pages
export const formEmailValue = writable('');
export const formPasswordValue = writable('');

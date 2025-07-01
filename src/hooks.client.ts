import { appCheck, initialize as initializeFirebase } from '$lib/api/firebase';
import { isAppCheckRejected } from '$lib/stores/app';
import { isInitializingFirebase } from '$lib/stores/auth';
import { initializeUser } from '$lib/stores/user';
import { PlausibleEvent } from '$lib/types/Plausible';
import { trackEvent } from '$lib/util';
import isFirebaseError from '$lib/util/types/isFirebaseError';
import { initializeSvelteI18n } from '$locales/initialize';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import type { ClientInit } from '@sveltejs/kit';
import { getToken } from 'firebase/app-check';

export const handleError = handleErrorWithSentry();

export const init = (() => {
  // Both are not awaited, and run concurrently
  initializeSvelteI18n().catch((e) => console.error('Error during svelte-i18n init', e));
  initializeFirebase()
    .then(async () => {
      try {
        // Use AppCheck if it is initialized (not on localhost development, for example)
        if (typeof import.meta.env.VITE_FIREBASE_APP_CHECK_PUBLIC_KEY !== 'undefined') {
          await getToken(appCheck(), /* forceRefresh= */ false);
          console.debug('App Check token retrieved successfully');
        }
      } catch (err) {
        // Handle any errors if the token was not retrieved.
        if (isFirebaseError(err) && err.code.startsWith('appCheck')) {
          // Seen:
          // - 'appCheck/recaptcha-error' (when loading in local dev)
          // - 'appCheck/throttled' (when loading on Firefox on Android)
          console.warn('Known appCheck error: ', err);
          trackEvent(PlausibleEvent.APP_CHECK_ERROR, { type: err.code });
        } else {
          console.warn('Unexpected App Check error: ', err);
          trackEvent(PlausibleEvent.APP_CHECK_ERROR);
        }
        isAppCheckRejected.set(true);
        isInitializingFirebase.set(false);
        throw new Error('App Check error after Firebase init, aborting init.');
      }
    })
    .then(initializeUser)
    .catch((e) => console.error('Error during init', e));
}) satisfies ClientInit;

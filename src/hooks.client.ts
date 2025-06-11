import { initialize as initializeFirebase } from '$lib/api/firebase';
import { initializeUser } from '$lib/stores/user';
import { initializeSvelteI18n } from '$locales/initialize';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import type { ClientInit } from '@sveltejs/kit';

export const handleError = handleErrorWithSentry();

export const init = (() => {
  // Both are not awaited, and run concurrently
  initializeSvelteI18n();
  initializeFirebase().then(initializeUser);
}) satisfies ClientInit;

import { dev } from '$app/environment';
import { PUBLIC_SENTRY_DSN } from '$env/static/public';
import envIsTrue from '$lib/util/env-is-true';
import { initializeSvelteI18n } from '$locales/initialize';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import * as Sentry from '@sentry/sveltekit';
import type { ClientInit } from '@sveltejs/kit';
import { capitalize } from 'lodash-es';

Sentry.init({
  dsn: PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: dev ? 'Development' : capitalize(import.meta.env.MODE),
  enabled: !envIsTrue(import.meta.env.VITE_SENTRY_DISABLE)
});

export const handleError = handleErrorWithSentry();

export const init = (async () => {
  // Not awaited
  initializeSvelteI18n();
}) satisfies ClientInit;

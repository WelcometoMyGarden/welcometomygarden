import { dev } from '$app/environment';
import { PUBLIC_SENTRY_DSN } from '$env/static/public';
import envIsTrue from '$lib/util/env-is-true';
import * as Sentry from '@sentry/sveltekit';
import { handleErrorWithSentry } from '@sentry/sveltekit';
import { capitalize } from 'lodash-es';

Sentry.init({
  dsn: PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  environment: dev ? 'Development' : capitalize(import.meta.env.MODE),
  tunnel: '/error-log-tunnel',
  enabled: !envIsTrue(import.meta.env.VITE_SENTRY_DISABLE)
});

export const handleError = handleErrorWithSentry();

// hooks.server.ts
import { DEFAULT_LANGUAGE } from '$lib/types/general';
import type { Handle } from '@sveltejs/kit';
import { locale } from 'svelte-i18n';
import browserDetectScript from './browser-support.min.js?raw';
import routes, { getBaseRouteIn } from '$lib/routes';

/**
 * Delete the PWA manifest from some routes, in the hope that those will not suggest
 * to be installed as PWA.
 * Note: this may have become irrelevant since the change that calls preventDefault on beforeinstallprompt,
 * it doesn't hurt to keep it anyway however.
 */
const ROUTES_WITHOUT_MANIFEST = [routes.APP_PAYMENT];

export const handle: Handle = async ({ event, resolve }) => {
  // SSR locale init based on Accept-Language
  const lang = event.request.headers.get('accept-language')?.split(',')[0];
  if (lang) {
    locale.set(lang);
  }
  return resolve(event, {
    // Set the right <html lang=""> attribute.
    // If per-page overrides are ever needed, we could transition to this approach:
    // https://github.com/sveltejs/kit/discussions/12376#discussioncomment-9876501
    transformPageChunk: ({ html }) => {
      let outHtml = html
        .replace('%lang%', event.params.lang ?? DEFAULT_LANGUAGE)
        .replace('%browserdetect%', browserDetectScript)
        // Using anything else than <!--# will result in fake warnings, at the moment
        // see https://github.com/sveltejs/kit/pull/15695
        // (the above PR is merged, but at the moment not available yet in this codebase,
        // so the warning does show at the moment of writing)
        // Note: this does not work with multi-line comments, we're keeping it limited to single lines
        // to avoid accidentally stripping more than just comments.
        .replace(/^\s*<!--#.*-->$\n/gm, '');
      for (const route of ROUTES_WITHOUT_MANIFEST) {
        if (getBaseRouteIn(event.route.id ?? '') === route) {
          outHtml = outHtml.replace(/^\s+<link rel="manifest".+$\n/gm, '');
          break;
        }
      }
      return outHtml;
    }
  });
};

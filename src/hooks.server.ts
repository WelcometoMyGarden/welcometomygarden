// hooks.server.ts
import { DEFAULT_LANGUAGE } from '$lib/types/general';
import type { Handle } from '@sveltejs/kit';
import { locale } from 'svelte-i18n';
import browserDetectScript from './browser-support.min.js?raw';
import capacitorSwClearIIFE from './capacitor-sw-clear.js?raw';
import routes, { getBaseRouteIn } from '$lib/routes';
import envIsTrue from '$lib/util/env-is-true';
import { IS_PREVIEW } from '$env/static/private';

/**
 * Delete the PWA manifest from some routes, in the hope that those will not suggest
 * to be installed as PWA.
 * Note: this may have become irrelevant since the change that calls preventDefault on beforeinstallprompt,
 * it doesn't hurt to keep it anyway however.
 */
const ROUTES_WITHOUT_MANIFEST = [routes.APP_PAYMENT];

/**
 * Indentation match whatever SvelteKit generates above and below
 */
const SW_INIT_SCRIPT_INDENTATION = '\t'.repeat(6);
const serviceWorkerInit = `if (globalThis.Capacitor?.isNativePlatform?.() && 'serviceWorker' in navigator) {\n${capacitorSwClearIIFE
  .split('\n')
  // Strip comments
  .filter((l) => !/^\s*\/\/.*^/.test(l))
  .map((l) => `${SW_INIT_SCRIPT_INDENTATION}${l}`)
  .join('\n')}\n${'\t'.repeat(5)}} else if ('serviceWorker' in navigator) {`;

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
        // Strip comments from app.html
        // Using anything else than <!--# will result in fake warnings, at the moment
        // see https://github.com/sveltejs/kit/pull/15695
        // (the above PR is merged, but at the moment not available yet in this codebase,
        // so the warning does show at the moment of writing)
        // Note: this does not work with multi-line comments, we're keeping it limited to single lines
        // to avoid accidentally stripping more than just comments.
        .replace(/^\s*<!--#.*-->$\n/gm, '')
        // Insert noindex meta tags for Firebase preview channels
        .replace(/^(\s*)%noindextag%\s*$\n/gm, (_: string | undefined, m1: string | undefined) => {
          if (envIsTrue(IS_PREVIEW)) {
            return `${m1}<meta name="robots" content="noindex" />\n`;
          }
          return '';
        })
        // Disable Service Worker load on Capacitor
        // We've noticed on real iOS devices that (presumably) the Service Worker page cache is used
        // when the device is starting the app offline. This circumvents our offline gate, and leaves
        // the app in a broken state. Moreover, even when the @capacitor/network handling kicks in on
        // on the front-end, the (potentially old) cached pages are used instead of erroring requests.
        // It's probably better to blanket-disable (not load) SWs on Capacitor, and clean up old SWs
        // there too.
        .replace("if ('serviceWorker' in navigator) {", serviceWorkerInit);
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

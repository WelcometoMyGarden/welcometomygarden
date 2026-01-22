import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '$lib/types/general';
import { init, register, waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';
import {
  coerceToSupportedLanguage,
  coerceToValidLangCode,
  getBrowserLanguage
} from '$lib/util/get-browser-lang';
import { browser } from '$app/environment';
import { getCookie } from '$lib/util';
import { isBot } from 'ua-parser-js/helpers';
import logger from '$lib/util/logger';

//
// Prerender on the root layout: default SSG for the whole app.
export const prerender = true;
// This is the SvelteKit default,
// but Firebase Hosting should be configured accordingly
export const trailingSlash = 'never';
// ssr = true is the default assumed here

export const load: LayoutLoad = async ({ params: { lang: pathLang }, url }) => {
  logger.debug('Outer layout load started');
  // Register languages for svelte-i18n
  // The language may or may not be supported, but it should be an iso-639-1 lowercase string.
  // It will be reported back through $locale, not the fallback.
  SUPPORTED_LANGUAGES.forEach((lang: string) => {
    register(lang, () => import(`../locales/${lang}.json`));
  });

  let newStoreLocale = coerceToValidLangCode(pathLang ?? DEFAULT_LANGUAGE);
  let newPath;

  if (browser) {
    // Allow locale-related redirects during load in a browser context
    let targetPathLang = coerceToSupportedLanguage(pathLang);

    const localeCookie = getCookie('locale');
    const browserLang = getBrowserLanguage();

    // https://docs.uaparser.dev/api/submodules/helpers/is-bot.html
    // https://github.com/faisalman/ua-parser-js/blob/d84ba1888b500ce2ba345f05885d5beef4d259c6/src/helpers/ua-parser-helpers.js#L163
    let canRedirectBasedOnBrowserLang = !isBot(navigator.userAgent);
    let candidateLangOverride;
    if (localeCookie) {
      // First priority, override target locale based on cookies
      candidateLangOverride = localeCookie;
    } else if (browserLang && canRedirectBasedOnBrowserLang) {
      // Second priority, use the browser language, except if this is a
      // known crawler with JS support
      candidateLangOverride = browserLang;
    }

    if (candidateLangOverride) {
      const validatedTargetLocale = coerceToValidLangCode(candidateLangOverride);
      newStoreLocale = validatedTargetLocale;
      targetPathLang = coerceToSupportedLanguage(validatedTargetLocale);
    }

    // Determine the redirection path based on the target language
    if (!!pathLang && targetPathLang === DEFAULT_LANGUAGE) {
      // If there is a path (any lang), but the target through cookies is English
      // then remove the lang path
      newPath = url.pathname.split('/').slice(2).join('/');
    } else if (!!pathLang && targetPathLang !== pathLang) {
      // If there is a path, target lang is NOT English, then modify the path
      // to match the target
      newPath = `/${targetPathLang}/${url.pathname.split('/').slice(2).join('/')}`;
    } else if (!pathLang && targetPathLang !== DEFAULT_LANGUAGE) {
      // If there is no path (and the target lang is not English)
      // then include the path
      newPath = `/${targetPathLang}${url.pathname}`;
    }
  }

  await init({
    fallbackLocale: DEFAULT_LANGUAGE,
    initialLocale: newStoreLocale ?? DEFAULT_LANGUAGE
  });

  logger.debug(`Initialized locale ${newStoreLocale} (${browser ? 'browser' : 'server'})`);

  // Necessary to avoid an SSR/CSR mismatch
  // the locale is only set inside [[lang]]/+layout.ts, because we need
  // the root layout here to be indepedent of the language/path loader, for the
  // purpose of rendering our own error template as a sibling here
  // Errors in the root +layout.ts display a built-in HTML page
  // (see https://github.com/sveltejs/kit/issues/10201#issuecomment-1599711576)
  await waitLocale();

  // Workaround to avoid an infinite loop when rendering the root layout,
  // by letting lang-path based redirects happen in the inner layout only
  // See the [[lang]]/+layout.ts
  return { newPath };
};

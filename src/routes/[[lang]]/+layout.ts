// Prerender on the root layout: default SSG for the whole app.
export const prerender = true;
// This is the SvelteKit default,
// but Firebase Hosting should be configured accordingly
export const trailingSlash = 'never';
// ssr = true is the default assumed here

// +layout.ts
import { init, waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';
import { DEFAULT_LANGUAGE } from '$lib/types/general';
import { browser } from '$app/environment';
import { getCookie } from '$lib/util';
import {
  coerceToSupportedLanguage,
  coerceToValidLangCode,
  getBrowserLanguage
} from '$lib/util/get-browser-lang';
import { redirect } from '@sveltejs/kit';
import { isBot } from 'ua-parser-js/helpers';

export const load: LayoutLoad = async ({ params: { lang: pathLang }, url }) => {
  // TODO: maybe we want to init this with the browser lang like before?
  // To be able to use the right lang later if needed.
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
  await waitLocale();

  console.log(`Initialized locale ${newStoreLocale} (${browser ? 'browser' : 'server'})`);

  if (newPath != null) {
    const newUrl = new URL(url);
    newUrl.pathname = newPath;
    console.log(`Redirecting ${url.pathname} to ${newPath}`);
    redirect(303, newUrl.toString());
  }
};

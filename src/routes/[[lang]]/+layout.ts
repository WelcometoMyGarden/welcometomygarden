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
import { coerceToSupportedLanguage, coerceToValidLangCode } from '$lib/util/get-browser-lang';
import { redirect } from '@sveltejs/kit';

export const load: LayoutLoad = async ({ params: { lang: pathLang }, url }) => {
  // TODO: maybe we want to init this with the browser lang like before?
  // To be able to use the right lang later if needed.
  let newStoreLocale = coerceToValidLangCode(pathLang ?? DEFAULT_LANGUAGE);
  let newPath;

  if (browser) {
    // Allow locale-related redirects during load in a browser context
    let targetPathLang = coerceToSupportedLanguage(pathLang);

    const localeCookie = getCookie('locale');
    if (localeCookie) {
      // Override target locale based on cookies
      const validatedCookieLocale = coerceToValidLangCode(localeCookie);
      newStoreLocale = validatedCookieLocale;
      targetPathLang = coerceToSupportedLanguage(validatedCookieLocale);
    }

    // Redirect based on the setcookie
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

  if (newPath) {
    const newUrl = new URL(url);
    newUrl.pathname = newPath;
    console.log(`Redirecting ${url.pathname} to ${newPath}`);
    redirect(303, newUrl.toString());
  }
};

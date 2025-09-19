// Prerender on the root layout: default SSG for the whole app.
export const prerender = true;
// This is the SvelteKit default,
// but Firebase Hosting should be configured accordingly
export const trailingSlash = 'never';
// ssr = true is the default assumed here

// +layout.ts
import { init, register, waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';
import { SUPPORTED_LANGUAGES } from '$lib/types/general';

export const load: LayoutLoad = async () => {
  // Initialize svelte-i18n
  // The language may or may not be supported, but it should be an iso-639-1 lowercase string.
  // It will be reported back through $locale, not the fallback.
  SUPPORTED_LANGUAGES.forEach((lang: string) => {
    register(lang, () => import(`../locales/${lang}.json`));
  });
  await init({ fallbackLocale: 'en', initialLocale: 'en' });
  await waitLocale();
};

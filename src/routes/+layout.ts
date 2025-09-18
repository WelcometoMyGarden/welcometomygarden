// Prerender on the root layout: default SSG for the whole app.
export const prerender = true;
// This is the SvelteKit default,
// but Firebase Hosting should be configured accordingly
export const trailingSlash = 'never';
// ssr = true is the default assumed here

// +layout.ts
import { browser } from '$app/environment';
import { initializeSvelteI18n } from '$locales/initialize';
import { locale, waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
  if (browser) {
    locale.set(window.navigator.language);
  }
  await initializeSvelteI18n();
  await waitLocale();
};

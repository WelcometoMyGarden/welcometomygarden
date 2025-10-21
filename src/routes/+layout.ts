import { SUPPORTED_LANGUAGES } from '$lib/types/general';
import { register } from 'svelte-i18n';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({}) => {
  // Register languages for svelte-i18n
  // The language may or may not be supported, but it should be an iso-639-1 lowercase string.
  // It will be reported back through $locale, not the fallback.
  SUPPORTED_LANGUAGES.forEach((lang: string) => {
    register(lang, () => import(`../locales/${lang}.json`));
  });
};

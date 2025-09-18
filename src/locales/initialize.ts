import { init, register } from 'svelte-i18n';
import { SUPPORTED_LANGUAGES } from '$lib/types/general';
import { getCookie } from '$lib/util';
import { coerceToValidLangCode, getBrowserLanguage } from '$lib/util/get-browser-lang';
import { browser } from '$app/environment';

export const initializeSvelteI18n = async () => {
  SUPPORTED_LANGUAGES.forEach((lang: string) => {
    register(lang, () => import(`../locales/${lang}.json`));
  });

  let lang: string;

  if (browser) {
    const localeCookie = getCookie('locale');
    if (localeCookie) {
      // Start from a cookie, if present.
      lang = coerceToValidLangCode(localeCookie);
    } else {
      lang = getBrowserLanguage();
    }
  } else {
    // ssr/ssg
    lang = 'en';
  }

  // Initialize svelte-i18n
  // The language may or may not be supported, but it should be an iso-639-1 lowercase string.
  // It will be reported back through $locale, not the fallback.
  await init({ fallbackLocale: 'en', initialLocale: lang });
};

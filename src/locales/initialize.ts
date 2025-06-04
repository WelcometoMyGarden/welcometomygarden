import { init, register } from 'svelte-i18n';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '$lib/types/general';
import { getCookie } from '$lib/util';
import coercedBrowserLang, { coerceToSupportedLanguage } from '$lib/util/get-browser-lang';

export const initializeSvelteI18n = async () => {
  SUPPORTED_LANGUAGES.forEach((lang: string) => {
    register(lang, () => import(`../locales/${lang}.json`));
  });

  let lang: SupportedLanguage;
  const localeCookie = getCookie('locale');
  if (localeCookie) {
    // Start from a cookie, if present.
    lang = coerceToSupportedLanguage(localeCookie);
  } else {
    lang = coercedBrowserLang();
  }

  // Initialize svelte-i18n
  await init({ fallbackLocale: 'en', initialLocale: lang });

  // It's possible that a user account has a different language setting,
  // this will then be updated in user.subscribe above. We're not waiting
  // for the user load to initialize svelte-i18n.
};

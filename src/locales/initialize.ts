import { locale } from 'svelte-i18n';
import { getCookie } from '$lib/util';
import { coerceToValidLangCode, getBrowserLanguage } from '$lib/util/get-browser-lang';
import { browser } from '$app/environment';

export const loadBrowserI18n = async () => {
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
  console.log(`Updating language to ${lang}`);
  locale.set(lang);
};

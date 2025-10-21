import { type MainLanguage, MAIN_LANGUAGES, DEFAULT_LANGUAGE } from '$lib/types/general';

import { coerceToSupportedLanguage } from './translation-shared';
export { coerceToSupportedLanguage, urlPathPrefix } from './translation-shared';

import ISO6391 from 'iso-639-1';

export const coerceToValidLangCode = (lang: string) => {
  const foundLocale = ISO6391.getAllCodes().find((c) => c === lang?.toLocaleLowerCase());
  return foundLocale ?? DEFAULT_LANGUAGE;
};

export const getBrowserLanguage = () =>
  // TODO: should we use getLocaleFromNavigator from svelte-i18n?
  coerceToValidLangCode(window.navigator.language?.split('-')[0].toLowerCase());

/**
 * Check the navigator language and returns it, if it is a supported locale.
 * Falls back to 'en'.
 */
const coercedBrowserLanguage = () => coerceToSupportedLanguage(getBrowserLanguage());

export default coercedBrowserLanguage;

export const coerceToMainLanguage = (lang: string | undefined | null): MainLanguage => {
  if ((MAIN_LANGUAGES as ReadonlyArray<string>).includes(lang ?? '')) {
    return lang as MainLanguage;
  } else {
    return DEFAULT_LANGUAGE;
  }
};

export const coerceToMainLanguageENBlank = (lang: string | undefined | null): string => {
  const coercedLang = coerceToMainLanguage(lang);
  if (coercedLang === 'en') {
    return '';
  }
  return coercedLang;
};

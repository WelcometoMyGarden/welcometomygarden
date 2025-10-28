import { type MainLanguage, MAIN_LANGUAGES, DEFAULT_LANGUAGE } from '$lib/types/general';

import { coerceToSupportedLanguage } from './translation-shared';
export { coerceToSupportedLanguage, urlPathPrefix } from './translation-shared';

import ISO6391 from 'iso-639-1';

const findValidLocale = (lang: string) =>
  ISO6391.getAllCodes().find((c) => c === lang?.toLocaleLowerCase());

export const isValidLocale = (lang: string) => !!findValidLocale(lang);

export const coerceToValidLangCode = (lang: string) => findValidLocale(lang) ?? DEFAULT_LANGUAGE;
/**
 * Get the language of the current browser
 *
 * svelte-i18n also has `getLocaleFromNavigator`, but we don't want to take into account regional differences
 * for languages in our logic yet, therefore we drop eventual region suffixes with this implementation.
 * https://github.com/kaisermann/svelte-i18n/blob/5afd1f8677c8371dcbec5b5b9a7175500f17591b/src/runtime/modules/localeGetters.ts#L35
 */
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

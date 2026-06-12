import { type MainLanguage, MAIN_LANGUAGES, DEFAULT_LANGUAGE } from '$lib/types/general';

import { coerceToSupportedLanguage } from './translation-shared';
export { coerceToSupportedLanguage, urlPathPrefix } from './translation-shared';

import ISO6391 from 'iso-639-1';

const findValidLocale = (lang: string) =>
  ISO6391.getAllCodes().find((c) => c === lang?.toLocaleLowerCase());

export const isValidLocale = (lang: string) => !!findValidLocale(lang);

export const coerceToValidLangCode = (lang: string) => findValidLocale(lang) ?? DEFAULT_LANGUAGE;

export const getBrowserLangAndRegion = () => {
  const browserLang = window.navigator.language;
  if (browserLang.length === 5) {
    // standard format of en-US
    // TODO: this is not reliably parsing BCP 47. A basic regex:
    // https://stackoverflow.com/questions/8758340/is-there-a-regex-to-test-if-a-string-is-for-a-locale/48300605#48300605
    const [lang, region] = browserLang.split('-');
    return { lang: lang.toLowerCase(), region: region.toUpperCase() };
  }
  return null;
};

/**
 * Get the language of the current browser
 *
 * svelte-i18n also has `getLocaleFromNavigator`, but we don't want to take into account regional differences
 * for languages in our logic yet, therefore we drop eventual region suffixes with this implementation.
 * https://github.com/kaisermann/svelte-i18n/blob/5afd1f8677c8371dcbec5b5b9a7175500f17591b/src/runtime/modules/localeGetters.ts#L35
 */
export const getBrowserLanguage = () =>
  // TODO: should we use getLocaleFromNavigator from svelte-i18n?
  // TODO: this does not follow the spec really
  // https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag
  coerceToValidLangCode(window.navigator.language.split('-')[0].toLowerCase());

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

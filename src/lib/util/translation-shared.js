// Written in JS because these are used by the svelte.config.js build config too
//
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../../lib/types/general.js';

/**
 *
 * @param {string | undefined | null} lang
 * @returns {import("$lib/types/general").SupportedLanguage}
 */
export const coerceToSupportedLanguage = (lang) => {
  if (/** @type{ReadonlyArray<string>}*/ (SUPPORTED_LANGUAGES).includes(lang ?? '')) {
    return /** @type {import("$lib/types/general").SupportedLanguage}*/ (lang);
  } else {
    return DEFAULT_LANGUAGE;
  }
};

/**
 *
 * @param {string | null | undefined} locale
 * @returns
 */
export const urlPathPrefix = (locale) => {
  let supportedLocale = coerceToSupportedLanguage(locale);
  if (supportedLocale === 'en') {
    return '';
  }
  return `/${supportedLocale}`;
};

/// <reference lib="dom" />
import {
  SUPPORTED_LANGUAGES,
  type MainLanguage,
  type SupportedLanguage,
  MAIN_LANGUAGES
} from '$lib/types/general';

/**
 * Check the navigator language and returns it, if it is a supported locale.
 * Falls back to 'en'.
 */
const coercedBrowserLanguage = () =>
  coerceToSupportedLanguage(window.navigator.language?.split('-')[0].toLowerCase());

export default coercedBrowserLanguage;

export const coerceToSupportedLanguage = (lang: string | undefined | null): SupportedLanguage => {
  if ((SUPPORTED_LANGUAGES as ReadonlyArray<string>).includes(lang ?? '')) {
    return lang as SupportedLanguage;
  } else {
    return 'en';
  }
};

export const coerceToMainLanguage = (lang: string | undefined | null): MainLanguage => {
  if ((MAIN_LANGUAGES as ReadonlyArray<string>).includes(lang ?? '')) {
    return lang as MainLanguage;
  } else {
    return 'en';
  }
};

export const coerceToMainLanguageENBlank = (lang: string | undefined | null): string => {
  const coercedLang = coerceToMainLanguage(lang);
  if (coercedLang === 'en') {
    return '';
  }
  return coercedLang;
};

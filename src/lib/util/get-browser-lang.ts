/// <reference lib="dom" />
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '$lib/types/general';

/**
 * Check the navigator language and returns it, if it is a supported locale.
 * Falls back to 'en'.
 */
const coercedBrowserLanguage = () =>
  coerceToSupportedLanguage(window.navigator.language?.split('-')[0].toLowerCase());

export default coercedBrowserLanguage;

export const coerceToSupportedLanguage = (lang: string | undefined): SupportedLanguage => {
  if ((SUPPORTED_LANGUAGES as ReadonlyArray<string>).includes(lang ?? '')) {
    return lang as SupportedLanguage;
  } else {
    return 'en';
  }
};

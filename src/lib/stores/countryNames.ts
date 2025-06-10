import { derived, get } from 'svelte/store';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import nl from 'i18n-iso-countries/langs/nl.json';
import fr from 'i18n-iso-countries/langs/fr.json';
import de from 'i18n-iso-countries/langs/de.json';
import es from 'i18n-iso-countries/langs/es.json';
import { locale } from 'svelte-i18n';
import { coerceToSupportedLanguage } from '$lib/util/get-browser-lang';
import { DEFAULT_LANGUAGE } from '$lib/types/general';
const localizedCountryNames = [en, nl, fr, de, es];
// Despite comments in https://github.com/michaelwittig/node-i18n-iso-countries/issues/136
// with https://github.com/KusStar/vite-bundle-visualizer, it seems like rollup preserves
// only the registered locales in the final bundle. That's good!
//
// For now, the bundle size impact of these files is also negligible.
// if it grows to many more languages, we can consider dynamic loading
localizedCountryNames.forEach((dataset) => countries.registerLocale(dataset));

/**
 * Object with localized country names for the current language
 * Keyed by their ISO 3166-1 Alpha-2 code.
 *
 * Defaults to English when no locale is set yet.
 */
export const countryNames = derived(locale, ($locale) => {
  const lang = coerceToSupportedLanguage($locale || DEFAULT_LANGUAGE);
  //  https://github.com/michaelwittig/node-i18n-iso-countries#get-all-names-by-their-iso-3166-1-alpha-2-code
  return countries.getNames(lang, { select: 'alias' });
});

/**
 * Guesses an alpha-2 country code based on Accept-Language headers
 */
export const guessCountryCode = () => {
  //  Instead of using a GeoIP API or database (https://github.com/runk/node-maxmind / https://db-ip.com/db/download/ip-to-country-lite)
  // Accept-Language headers often contain a country code
  // https://db-ip.com/db/format/ip-to-country-lite/mmdb.html
  // From Plausible data,
  // Belgium, France, Netherlands, Germany, UK, Spain, Italy, US, Canada, Switzerland, Austria
  // These cover more than 95% of signups
  //
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
  const navigatorLang = window.navigator.language.split('-') || [];
  if (navigatorLang.length > 1) {
    // We may have a country code after the -, like 'fr-BE'
    const countryCodeCandidate = navigatorLang[1];

    // Validate
    if (get(countryNames)[countryCodeCandidate]) {
      return countryCodeCandidate;
    }
  } else if (navigatorLang.length === 1) {
    // There is no country split in the language code.
    // Make an educated guess for a country based on the language,
    // based on most frequent countries for account creations.
    switch (navigatorLang[0].toLocaleLowerCase()) {
      case 'de':
        return 'DE';
      case 'es':
        return 'ES';
      case 'en':
        return 'GB';
      default:
        return 'BE';
    }
  } else {
    return 'BE';
  }
};

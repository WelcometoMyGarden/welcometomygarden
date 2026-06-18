/**
 * @type {SupportedLanguage[]}
 */
exports.SUPPORTED_LANGUAGES = ['en', 'nl', 'fr', 'de', 'es'];

/**
 * @type {MainLanguage[]}
 */
exports.MAIN_LANGUAGES = ['en', 'nl', 'fr'];

/**
 * @param {any} lang
 * @returns {SupportedLanguage}
 */
exports.coerceToSupportedLanguage = (lang) => {
  if (exports.SUPPORTED_LANGUAGES.includes(lang ?? '')) {
    return lang;
  }
  return 'en';
};

/**
 * @param {any} lang
 * @returns {MainLanguage}
 */
exports.coerceToMainLanguage = (lang) => {
  if (exports.MAIN_LANGUAGES.includes(lang ?? '')) {
    return lang;
  }
  return 'en';
};

/**
 * Returns the URL path prefix for the given language, e.g. '/nl' for Dutch
 * and '' for English (the default, unprefixed locale).
 * @param {string | null | undefined} language
 * @returns {string}
 */
exports.urlPathPrefix = (language) => {
  const supported = exports.coerceToSupportedLanguage(language);
  if (supported === 'en') return '';
  return `/${supported}`;
};

const { frontendUrl } = require('../sharedConfig');
const removeDiacritics = require('./removeDiacritics');

exports.normalizeMessage = (str) => str.replace(/\n\s*\n\s*\n/g, '\n\n');
exports.normalizeName = (str) => removeDiacritics(str).toLowerCase();
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

/**
 * @param {object} config
 * @param {string} config.displayName - the sender's display name
 * @param {string} config.chatId
 * @param {string} [config.host] - the URL host (no protocol, includes port). Overrides the default frontend URL.
 * @param {string} [config.language] - the recipient's communicationLanguage; used to localize the URL path prefix
 * @returns {string}
 */
exports.buildMessageUrl = ({ displayName, chatId, host, language }) => {
  const baseUrl = host ? `https://${host}` : frontendUrl();
  const langPrefix = exports.urlPathPrefix(language);
  // TODO: this will also split as soon as it sees something non-ASCI/diacritic
  // so it might chop up a name weirdly. Luckily it's a vanity URL. Adjust?
  const senderNameParts = displayName.split(/[^A-Za-z-]/);
  return `${baseUrl}${langPrefix}/chat/${exports.normalizeName(senderNameParts[0])}/${chatId}`;
};

/**
 * @type {SupportedLanguage[]}
 */
const SUPPORTED_LANGUAGES = ['en', 'nl', 'fr', 'de', 'es'];
/**
 * @type {MainLanguage[]}
 */
const MAIN_LANGUAGES = ['en', 'nl', 'fr'];

/**
 * @param {any} lang
 * @returns {SupportedLanguage}
 */
exports.coerceToSupportedLanguage = (lang) => {
  if (SUPPORTED_LANGUAGES.includes(lang ?? '')) {
    return lang;
  }
  return 'en';
};

/**
 *
 * @param {any} lang
 * @returns {MainLanguage}
 */
exports.coerceToMainLanguage = (lang) => {
  if (MAIN_LANGUAGES.includes(lang ?? '')) {
    return lang;
  }
  return 'en';
};

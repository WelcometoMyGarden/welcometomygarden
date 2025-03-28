const { frontendUrl } = require('../sharedConfig');
const removeDiacritics = require('./removeDiacritics');

exports.normalizeMessage = (str) => str.replace(/\n\s*\n\s*\n/g, '\n\n');
exports.normalizeName = (str) => removeDiacritics(str).toLowerCase();
/**
 *
 * @param {string} displayName
 * @param {string} chatId
 * @param {string} [host] the URL host. Does not include the protocol, but does include the port (location.host)
 * @returns
 */
exports.buildMessageUrl = (displayName, chatId, host) => {
  const baseUrl = host ? `https://${host}` : frontendUrl();
  // TODO: this will also split as soon as it sees something non-ASCI/diacritic
  // so it might chop up a name weirdly. Luckily it's a vanity URL. Adjust?
  const senderNameParts = displayName.split(/[^A-Za-z-]/);
  return `${baseUrl}/chat/${this.normalizeName(senderNameParts[0])}/${chatId}`;
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
  } else {
    return 'en';
  }
};

/**
 *
 * @param {any} lang
 * @returns {MainLanguage}
 */
exports.coerceToMainLanguage = (lang) => {
  if (MAIN_LANGUAGES.includes(lang ?? '')) {
    return lang;
  } else {
    return 'en';
  }
};

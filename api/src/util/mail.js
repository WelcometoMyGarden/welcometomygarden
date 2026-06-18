const { frontendUrl } = require('../sharedConfig');
const removeDiacritics = require('./removeDiacritics');
const { urlPathPrefix } = require('./translations');

/**
 * @param {string} str
 */
exports.normalizeMessage = (str) => str.replace(/\n\s*\n\s*\n/g, '\n\n');
/**
 * @param {string} str
 */
exports.normalizeName = (str) => removeDiacritics(str).toLowerCase();

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
  const langPrefix = urlPathPrefix(language);
  // TODO: this will also split as soon as it sees something non-ASCI/diacritic
  // so it might chop up a name weirdly. Luckily it's a vanity URL. Adjust?
  const senderNameParts = displayName.split(/[^A-Za-z-]/);
  return `${baseUrl}${langPrefix}/chat/${exports.normalizeName(senderNameParts[0])}/${chatId}`;
};

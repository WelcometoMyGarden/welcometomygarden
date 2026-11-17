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

/**
 * @typedef {Object} UnsubscribeURLConfig
 * @property {string} email
 * @property {string} secret
 * @property {string} flow used as utm_source
 * @property {string} content used as utm_content
 */

/**
 * Creates an authenticated email preferences URL. A GET redirects to the email preferences page,
 * a POST (RFC 8058 one-click) unsubscribes the user from news emails.
 * See `handleUnsubscribeRouter` in ../sendgrid/manageEmailPreferences.js
 * @param {UnsubscribeURLConfig} config
 */
exports.createUnsubscribeURL = ({ email, secret, flow, content }) => {
  const params = new URLSearchParams({
    e: email,
    s: secret,
    utm_source: flow,
    utm_medium: 'email',
    utm_content: content
  });
  return `${frontendUrl()}/email-preferences?${params}`;
};

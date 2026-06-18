/**
 * @param {import('express').Request['query']} query
 */
exports.parseEmailAuth = function (query) {
  // https://expressjs.com/en/api.html#express.urlencoded
  const { email: inEmail, e, secret: inSecret, s } = query;
  let email = e ?? inEmail;
  // SendGrid does itself not URL-encode custom fields in some contexts
  // (double check which ones)
  // This attempts to fix the parsing mistakes from this
  if (typeof email === 'string') {
    // replace spaces by a plus
    email = email.replace(/ /g, '+');
  }
  const secret = s ?? inSecret;
  return { email, secret };
};

/**
 * Masks a per-user `secret` for logging. The secret is a bearer credential that
 * authorizes account actions via email links without logging in, so it must not
 * be written to logs in cleartext. We keep the first 3 characters (enough to
 * correlate log lines during debugging) and append an ellipsis.
 *
 * @param {unknown} secret
 * @returns {string} the first 3 characters followed by '...', or '<none>' when
 *   the secret is missing/not a string.
 */
module.exports = (secret) => {
  if (typeof secret !== 'string' || secret.length === 0) {
    return '<none>';
  }
  return `${secret.slice(0, 3)}...`;
};

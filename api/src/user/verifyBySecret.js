const { logger } = require('firebase-functions');
const { db, auth } = require('../firebase');

/**
 * Verifies an email + secret combination against Firestore users-private data.
 *
 * Resolves the uid via Firebase Authentication (`getUserByEmail`), then compares
 * the provided secret with the `secret` stored in the user's users-private
 * document. The secret is a per-user key (see users-private `secret`) that lets
 * users take certain actions via email links without logging in.
 *
 * Note: an earlier implementation verified against the SendGrid contact's secret
 * custom field, from before the secret was available in Firebase.
 *
 * @param {string} email
 * @param {string} secret
 * @param {string} [source] free-form context for logging
 * @returns {Promise<string>} the uid of the user in case of success
 * @throws {Error} 'invalid_state' when the user/secret is unexpectedly missing,
 *   'secret_mismatch' when the secret does not match
 */
module.exports = async function verifyBySecret(email, secret, source) {
  const logMetadata = { email, secret, source };

  // Resolve the user via Firebase Auth. Throws auth/user-not-found if unknown.
  const { uid } = await auth.getUserByEmail(email);

  const usersPrivateRef = /** @type {DocumentReference<UserPrivate>} */ (
    db.collection('users-private').doc(uid)
  );
  const docSnap = await usersPrivateRef.get();
  if (!docSnap.exists) {
    logger.error(`Unexpected missing users-private data for ${email}`, logMetadata);
    // Shouldn't happen
    throw new Error('invalid_state');
  }

  const data = docSnap.data();
  if (typeof data?.secret !== 'string') {
    logger.error(`Unexpected missing 'secret' field for ${email}`, logMetadata);
    // Shouldn't happen
    throw new Error('invalid_state');
  }

  if (data.secret !== secret) {
    logger.warn('Secret mismatch', logMetadata);
    throw new Error('secret_mismatch');
  }

  return uid;
};

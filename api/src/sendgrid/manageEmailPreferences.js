const { logger } = require('firebase-functions');
const fail = require('../util/fail');
const getContactByEmail = require('./getContactByEmail');
const { db } = require('../firebase');

/**
 * See https://meta.discourse.org/t/setup-discourseconnect-official-single-sign-on-for-discourse-sso/13045
 * Note that the URL-decoding and encoding discussed in the guide will be handled by URLSearchParams on the frontend.
 * sso payload should NOT be URL encoded
 * @param {FV2.CallableRequest<import("../../../src/lib/api/functions").ManageEmailPreferencesRequest>} request
 * @returns {Promise<import("../../../src/lib/api/functions").ManageEmailPreferencesResponse>} sso payload will not be URL-encoded
 */
// eslint-disable-next-line consistent-return
module.exports = async function manageEmailPreferences({ data, auth: callAuth }) {
  const { type, email, secret } = data;
  if (!email) {
    return fail('invalid-argument');
  }

  let error = null;
  let uid = null;

  // -- Authenticate
  //
  // TODO: check if token.email exists generally
  // Check for Firebase authentication
  if (callAuth && callAuth.token.email === email) {
    logger.log('Authenticated via Firebase token');
    // The target email is authenticated, allow all operations
    uid = callAuth.uid;
  } else {
    // No auth exists, or the auth is from another account.

    // Check for anonymous verification auth by SendGrid contact secret
    // (expected to be common)
    /** @type {SendGrid.ContactDetails | null} */
    let contact = null;
    try {
      contact = await getContactByEmail(email);
      if (typeof contact.custom_fields.secret !== 'string') {
        logger.error(`Unexpected missing 'secret' custom field for ${email}`);
        // Shouldn't happen
        error = 'invalid_state';
      }

      if (contact.custom_fields.secret !== secret) {
        error = 'secret_mismatch';
      }

      // Success case
      uid = contact.custom_fields.wtmg_id.toString();
    } catch (e) {
      // FB auth missing or invalid, and no contact exists
      // Some WTMG users don't have contacts, namely, those who have:
      // - `news === false` since before the auto-syncing release && who didn't change any profile data after that
      // (+ some rare error cases)
      // (Some users DO have contacts, but their sendgridIds aren't linked in FB: we take SG as the source of truth for the secret; irrelevant here)
      //
      // commit bf57442b0485ae1209d4155206339b8099843844 at 2023-02-03T03:46:00+5:30 auto syncing to SendGrid
      //
      // Possible cases of transactional email that may reach a news===false without a contact:
      // - "your garden has been unlisted" email
      // Essential service notification relating to your user agreement.
      error = 'no_contact';
    }
  }

  if (error) {
    return {
      status: 'error',
      error
    };
  }

  const userPrivateRef = /** @type {DocumentReference<UserPrivate>} */ (
    db.collection('users-private').doc(uid)
  );
  const docSnap = await userPrivateRef.get();
  if (!docSnap.exists) {
    fail('failed-precondition');
  }
  if (type === 'get') {
    const doc = docSnap.data();
    return {
      status: 'ok',
      emailPreferences: doc.emailPreferences
    };
  }
  if (type === 'set') {
    // Validate data (NOTE: we might consider a validation library like ajv
    // if we need to do this more often)
    const expectedKeys = ['news', 'newChat'];
    const entries = Object.entries(data.emailPreferences);
    const isValid =
      entries.length === 2 &&
      expectedKeys.reduce(
        (previousFound, ek) =>
          previousFound && !!entries.find(([k, v]) => k === ek && typeof v === 'boolean'),
        true
      );
    if (!isValid) {
      // Shouldn't happen with a correctly implemented client
      fail('invalid-argument');
    }

    try {
      await userPrivateRef.update({ emailPreferences: data.emailPreferences });
    } catch (e) {
      logger.error('Save failed');
      return {
        status: 'error',
        error: 'save_failed'
      };
    }

    return {
      status: 'ok',
      emailPreferences: data.emailPreferences
    };
  }
  logger.error('No valid operation given');
  fail('invalid-argument');
};

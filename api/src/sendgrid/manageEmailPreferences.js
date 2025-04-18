const { logger } = require('firebase-functions');
const fail = require('../util/fail');
const getContactByEmail = require('./getContactByEmail');
const { db } = require('../firebase');
const querystring = require('node:querystring');

/**
 *
 * @param {string} email
 * @param {string} secret
 * @param {string} [ source ]
 * @returns the uid of the user in case of success
 */
async function verifyBySecret(email, secret, source) {
  // Check for anonymous verification auth by SendGrid contact secret
  // (expected to be common)
  let logMetadata = { email, secret, source };
  /** @type {SendGrid.ContactDetails | null} */
  let contact = null;
  // This might throw when FB auth missing or invalid, and no contact exists
  // Some WTMG users don't have contacts, namely, those who have:
  // - `news === false` since before the auto-syncing release && who didn't change any profile data after that
  // (+ some rare error cases)
  // (Some users DO have contacts, but their sendgridIds aren't linked in FB: we take SG as the source of truth for the secret; irrelevant here)
  // commit bf57442b0485ae1209d4155206339b8099843844 at 2023-02-03T03:46:00+5:30 auto syncing to SendGrid
  // Possible cases of transactional email that may reach a news===false without a contact:
  // - "your garden has been unlisted" email
  // Essential service notification relating to your user agreement.
  contact = await getContactByEmail(email);
  if (typeof contact.custom_fields.secret !== 'string') {
    logger.error(`Unexpected missing 'secret' custom field for ${email}`, logMetadata);
    // Shouldn't happen
    throw new Error('invalid_state');
  }

  if (contact.custom_fields.secret !== secret) {
    logger.warn('Secret mismatch', logMetadata);
    throw new Error('secret_mismatch');
  }

  return contact.custom_fields.wtmg_id.toString();
}

/**
 * See https://meta.discourse.org/t/setup-discourseconnect-official-single-sign-on-for-discourse-sso/13045
 * Note that the URL-decoding and encoding discussed in the guide will be handled by URLSearchParams on the frontend.
 * sso payload should NOT be URL encoded
 * @param {FV2.CallableRequest<import("../../../src/lib/api/functions").ManageEmailPreferencesRequest>} request
 * @returns {Promise<import("../../../src/lib/api/functions").ManageEmailPreferencesResponse>} sso payload will not be URL-encoded
 */

async function manageEmailPreferences({ data, auth: callAuth }) {
  const { type, email, secret } = data;
  if (!email) {
    return fail('invalid-argument');
  }

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
    try {
      uid = await verifyBySecret(email, secret, 'manual');
    } catch (e) {
      let errorMessage = 'unknown';
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      return {
        status: 'error',
        error: errorMessage
      };
    }
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
}

const express = require('express');
const { sendPlausibleEvent } = require('../util/plausible');
const handleUnsubscribeRouter = express();

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function handleUnsubscribePost(req, res) {
  // https://expressjs.com/en/api.html#express.urlencoded
  // Parse expected properties and their
  const { email: inEmail, e, secret: inSecret, s } = req.query;
  const secret = s ?? inSecret;
  const email = e ?? inEmail;

  if (typeof email !== 'string' || typeof secret !== 'string') {
    logger.warn(
      'Attempted to unsubscribe a user with a POST request, but the email or secret are missing',
      { email, secret }
    );
    return res.sendStatus(400);
  }

  let uid;
  try {
    uid = await verifyBySecret(email, secret, 'list-unsubscribe-post');
  } catch (e) {
    logger.error(
      'Attempted to unsubscribe a user with a POST request, but the secret can not be verified',
      { email, secret }
    );
    return res.sendStatus(400);
  }

  // Apply the unsubscribe
  const userPrivateRef = /** @type {DocumentReference<UserPrivate>} */ (
    db.collection('users-private').doc(uid)
  );
  const docSnap = await userPrivateRef.get();
  if (!docSnap.exists) {
    logger.warn(`Trying to unsubscribe an account without users-private data`, {
      email,
      secret,
      uid
    });
    return res.sendStatus(500);
  }

  logger.info('Unsubscribing a user from the newsletter using List-Unsubscribe-Post', {
    uid,
    email,
    alreadyUnsubscribed: !docSnap.data()?.emailPreferences.news
  });

  await Promise.allSettled([
    userPrivateRef.update({ 'emailPreferences.news': false }),
    sendPlausibleEvent('Email Unsubscribe', {
      functionName: 'handleUnsubscribePost',
      props: {
        source: 'list-unsubscribe-post'
      }
    })
  ]);

  return res.sendStatus(200);
}

// Handles List-Unsubscribe-Post: List-Unsubscribe=One-Click
// Redirect
//
// Make sure that HEAD etc also get handled by using express directly
// https://github.com/expressjs/expressjs.com/issues/748
// node querystring is used by default for query parsing, so we also use it for parsing back
// https://expressjs.com/en/5x/api.html#req.query
// https://expressjs.com/en/5x/api.html#app.settings.table
handleUnsubscribeRouter.get('/email-preferences', (req, res) =>
  res.redirect(`/my-email-preferences?${querystring.encode(req.query ?? {})}`)
);
handleUnsubscribeRouter.post('/email-preferences', handleUnsubscribePost);

module.exports = { manageEmailPreferences, handleUnsubscribeRouter };

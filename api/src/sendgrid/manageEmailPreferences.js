const { logger } = require('firebase-functions');
const fail = require('../util/fail');
const verifyBySecret = require('../user/verifyBySecret');
const { db } = require('../firebase');
const querystring = require('node:querystring');

/**
 * @param {FV2.CallableRequest<import("../../../src/lib/api/functions").ManageEmailPreferencesRequest>} request
 * @returns {Promise<import("../../../src/lib/api/functions").ManageEmailPreferencesResponse>} sso payload will not be URL-encoded
 */

async function manageEmailPreferences({ data, auth: callAuth }) {
  const { type, email, secret } = data;
  if (!email || !secret) {
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
      emailPreferences: doc?.emailPreferences
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
const { parseEmailAuth } = require('../user/util/parseEmailAuth');
const handleUnsubscribeRouter = express();

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function handleUnsubscribePost(req, res) {
  // Note: according to the spec, mailbox provider will also include POST body data:
  //
  // > A mail receiver can do a one-click unsubscription by performing an HTTPS POST to the HTTPS URI in the List-Unsubscribe header.
  // > It sends the key/value pair in the List-Unsubscribe-Post header as the request body.
  // > The POST content SHOULD be sent as 'multipart/form-data' [RFC7578] or MAY be sent as 'application/x-www-form-urlencoded'.
  // > These encodings are the ones used by web browsers when sending forms.
  // > The target of the POST action is the same as the one in the GET action for a manual unsubscription, so this is intended to allow the same server code to handle both.
  //
  // ... but we should be able to safely ignore this, since our target URL ("HTTPS URI in the List-Unsubscribe header")
  // already includes query parameters, which we parse here.

  const { email, secret } = parseEmailAuth(req.query);

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
  // @ts-ignore it seems that the parsed query string could be more complex than
  // the Dict expected by .encode(), but we are currently not using this for complex cases
  res.redirect(`/my-email-preferences?${querystring.encode(req.query ?? {})}`)
);
handleUnsubscribeRouter.post('/email-preferences', handleUnsubscribePost);

module.exports = { manageEmailPreferences, handleUnsubscribeRouter };

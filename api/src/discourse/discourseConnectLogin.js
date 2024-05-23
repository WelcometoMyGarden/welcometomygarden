/* eslint-disable camelcase */

// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const functions = require('firebase-functions');
const { createHmac } = require('crypto');
const { Buffer } = require('node:buffer');
const fail = require('../util/fail');
const { db } = require('../firebase');

/**
 * @typedef {import("../../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

/** @type {string | null} */
const DISCOURSE_CONNECT_SECRET = functions.config().discourse
  ? functions.config().discourse.connect_secret
  : null;

/**
 * @param {string} payload
 */
const getHmacDigest = (payload) => {
  const hmac = createHmac('sha256', /** @type {string} */ (DISCOURSE_CONNECT_SECRET));
  return hmac.update(payload).digest('hex');
};

exports.getHmacDigest = getHmacDigest;

/**
 * See https://meta.discourse.org/t/setup-discourseconnect-official-single-sign-on-for-discourse-sso/13045
 * Note that the URL-decoding and encoding discussed in the guide will be handled by URLSearchParams on the frontend.
 * @param {import("../../../src/lib/api/functions").DiscourseConnectLoginRequest} data sso payload should NOT be URL encoded
 * @param {import('firebase-functions/v1/https').CallableContext} context
 * @returns {Promise<import("../../../src/lib/api/functions").DiscourseConnectLoginResponse | undefined>} sso payload will not be URL-encoded
 */
exports.discourseConnectLogin = async (data, context) => {
  if (DISCOURSE_CONNECT_SECRET == null) {
    fail('failed-precondition');
  }
  // Validation
  if (!context.auth) {
    fail('unauthenticated');
  }

  if (!(context && context.auth && context.auth.token)) {
    fail('internal');
  }

  if (!(typeof data.sig === 'string' && typeof data.sso === 'string')) {
    console.warn('Improper payload & signature received');
    fail('invalid-argument');
  }

  const { sig, sso } = data;

  const {
    uid,
    token: { email, email_verified }
  } = context.auth;

  if (!(email_verified && email)) {
    console.warn(
      'A non-verified or empty email account tried to log into Discourse. The frontend should prevent this'
    );
    fail('invalid-argument');
  }

  // Validate the payload using a HMAC digest

  const payloadDigest = getHmacDigest(sso);
  if (payloadDigest !== sig) {
    console.warn("Request payload signature didn't match");
    fail('invalid-argument');
  }

  // Check if the user is a superfan
  const userPublicData = /** @type {UserPublic | undefined} */ (
    (await db.doc(`users/${uid}`).get()).data()
  );
  if (!userPublicData) {
    // Shouldn't happen. Any authenticated user should have a users-private doc.
    fail('internal');
  }

  if (!userPublicData.superfan) {
    console.warn('A non-superfan tried to login into Discourse. The frontend should prevent this.');
    fail('unauthenticated');
  }

  // Now we have verified: Firebase auth, email verified, superfan status
  // Compute the Discourse login properties

  // Extract the nonce & return URL from the validated request payload
  const requestPayloadParams = new URLSearchParams(Buffer.from(sso, 'base64').toString());
  const decodedRequestNonce = requestPayloadParams.get('nonce');
  const decodedReturnUrl = requestPayloadParams.get('return_sso_url');
  if (!decodedRequestNonce || !decodedReturnUrl) {
    console.error("Couldn't decode request nonce or return_sso_url");
    fail('internal');
  }

  // Not adding the full name for privacy reasons
  const name = `${userPublicData.firstName}`;

  const responsePayload = new URLSearchParams({
    nonce: decodedRequestNonce,
    email,
    external_id: uid,
    name
    // suppress_welcome_message ?
  });

  const base64ResponsePayload = Buffer.from(responsePayload.toString()).toString('base64');
  const responseSig = getHmacDigest(base64ResponsePayload);
  return { sso: base64ResponsePayload, sig: responseSig, return_sso_url: decodedReturnUrl };
};

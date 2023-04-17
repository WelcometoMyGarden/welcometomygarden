// @ts-check
/* eslint-disable camelcase */
// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const functions = require('firebase-functions');
const { sendgrid: sendgridClient } = require('./sendgrid/sendgrid');
const fail = require('./util/fail');
const { sendAccountVerificationEmail, sendPasswordResetEmail } = require('./mail');
const removeEndingSlash = require('./util/removeEndingSlash');
const { db, auth } = require('./firebase');

/**
 * @typedef {import("../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

const SG_KEY = functions.config().sendgrid.marketing_key;
if (SG_KEY) {
  sendgridClient.setApiKey(SG_KEY);
}

const frontendUrl = removeEndingSlash(functions.config().frontend.url);

/**
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 */
const sendVerificationEmail = async (email, firstName, language) => {
  // https://firebase.google.com/docs/auth/admin/email-action-links#generate_email_verification_link
  // https://firebase.google.com/docs/auth/custom-email-handler
  const link = await auth.generateEmailVerificationLink(email, {
    url: `${frontendUrl}/account`
  });

  await sendAccountVerificationEmail(email, firstName, link, language);
};
exports.sendVerificationEmail = sendVerificationEmail;

exports.requestPasswordReset = async (email) => {
  if (!email) throw new functions.https.HttpsError('invalid-argument');

  try {
    const exists = await auth.getUserByEmail(email);
    if (!exists) return { message: 'Password reset request received', success: true };
    const link = await auth.generatePasswordResetLink(email, {
      url: `${frontendUrl}/reset-password`
    });

    const user = await auth.getUserByEmail(email);
    await sendPasswordResetEmail(email, user.displayName, link);

    return { message: 'Password reset request received', success: true };
  } catch (ex) {
    throw new functions.https.HttpsError('invalid-argument');
  }
};

exports.changeEmail = async () => {};

exports.resendAccountVerification = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', '');
  }

  /** @type {UserRecord} */
  let user;
  /** @type {UserPrivate} */
  let userPrivate;
  try {
    const [userIn, userPrivateIn] = await Promise.all([
      auth.getUser(context.auth.uid),
      /** @type {Promise<UserPrivate>} */ (
        db
          .doc(`users-private/${context.auth.uid}`)
          .get()
          .then((dS) => dS.data())
      )
    ]);
    user = userIn;
    userPrivate = userPrivateIn;
  } catch (ex) {
    console.log(
      'Exception while trying to get the user while resending the account verification email',
      ex
    );
    throw new functions.https.HttpsError('permission-denied', '');
  }

  if (!user || user.emailVerified) throw new functions.https.HttpsError('permission-denied', '');
  if (!user.email) throw new functions.https.HttpsError('invalid-argument', '');

  await sendVerificationEmail(
    user.email,
    // Empty string shouldn't occur, as we make it mandatory and set it on user creation.
    user.displayName ?? '',
    userPrivate.communicationLanguage ?? 'en'
  );
};

exports.setAdminRole = async (data, context) => {
  if (!context.auth) {
    return fail('unauthenticated');
  }

  const { uid } = context.auth;
  const adminUser = await auth.getUser(uid);
  if (!adminUser.customClaims || !adminUser.customClaims.admin) {
    return fail('permission-denied');
  }

  const { newStatus } = data;
  const user = await auth.getUserByEmail(data.email);
  await auth.setCustomUserClaims(user.uid, { admin: newStatus });

  return { message: `${data.email} admin status set successfully.` };
};

/**
 * Function to force the verification of an email, only to be used by admins.
 * The normal verification process starts in createUser.
 */
exports.verifyEmail = async ({ email }, context) => {
  if (!context.auth) {
    return fail('unauthenticated');
  }

  const { uid } = context.auth;
  const adminUser = await auth.getUser(uid);
  if (!adminUser.customClaims || !adminUser.customClaims.admin) {
    return fail('permission-denied');
  }

  const userToUpdate = await auth.getUserByEmail(email);
  await auth.updateUser(userToUpdate.uid, {
    emailVerified: true
  });
  return { message: `${email} was verified` };
};

exports.updateEmail = async ({ oldEmail, newEmail }, context) => {
  if (!context.auth) {
    return fail('unauthenticated');
  }

  const { uid } = context.auth;
  const adminUser = await auth.getUser(uid);
  if (!adminUser.customClaims || !adminUser.customClaims.admin) {
    return fail('permission-denied');
  }

  const userToUpdate = await auth.getUserByEmail(oldEmail);
  await auth.updateUser(userToUpdate.uid, {
    email: newEmail,
    emailVerified: true
  });
  return { message: `${oldEmail} was changed to ${newEmail}` };
};

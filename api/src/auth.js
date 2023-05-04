// @ts-check
/* eslint-disable camelcase */
// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const functions = require('firebase-functions');
// eslint-disable-next-line import/no-unresolved
const { FieldValue } = require('firebase-admin/firestore');
const { sendgrid: sendgridClient } = require('./sendgrid/sendgrid');
const fail = require('./util/fail');
const { sendAccountVerificationEmail, sendPasswordResetEmail } = require('./mail');
const removeEndingSlash = require('./util/removeEndingSlash');
const { db, auth } = require('./firebase');
const { updateSendgridContactEmail } = require('./sendgrid/updateContactEmail');
const stripe = require('./subscriptions/stripe');
const { updateDiscourseUser } = require('./discourse/updateDiscourseUser');

/**
 * @typedef {import("../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

/**
 * @template T
 * @typedef {import("firebase-admin/firestore").DocumentReference} DocumentReference
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

// eslint-disable-next-line consistent-return
exports.requestPasswordReset = async (email) => {
  if (!email) fail('invalid-argument');

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
    fail('invalid-argument');
  }
};

exports.resendAccountVerification = async (_, context) => {
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

/**
 * User-callable function to request an email change. Will trigger a verification
 * email to be sent to the new email.
 *
 * @param {string} newEmail
 * @param {import("firebase-functions/v1/https").CallableContext} context
 */
exports.requestEmailChange = async (newEmail, context) => {
  if (!context.auth) {
    fail('unauthenticated');
  }

  const currentEmail = context.auth?.token.email;

  const userPrivateRef = /** @type {DocumentReference<UserPrivate>} */ (
    db.doc(`users-private/${context.auth.uid}`)
  );
  const userPrivateData = (await userPrivateRef.get()).data();

  const authUser = await auth.getUser(context.auth.uid);

  if (!currentEmail || !userPrivateData || !authUser || !authUser.displayName) {
    fail('failed-precondition');
  }

  // Can not request an email change to your current email
  if (newEmail === currentEmail) {
    fail('invalid-argument');
  }

  // Generate verification/change email
  // Note: NOT SUPPORTED in the emulator yet https://github.com/firebase/firebase-tools/issues/3424
  const verifyAndChangeActionLink = await auth.generateVerifyAndChangeEmailLink(
    currentEmail,
    newEmail
  );

  // With the above successful: mark that the user is in progress of changing their email address.
  // This will be used later to verify requests for propagateEmailChange (see below)
  await userPrivateRef.update({
    newEmail,
    // ! Don't overwrite a marker for an oldEmail, if one already exists.
    //
    // This pre-existing marker means that the user already changed their email in the past
    // From experimentation, it seems that a Firebase Auth recovery link resets to the *first* original when a
    // rapid succession of email changes occurs, even if the recovery link for the last one is clicked.
    // This marker is used for recovery email verification in propagateEmailChange further on, hence, it should also keep to
    // the original email.
    //
    // NOTE: It is possible that Firebase allows recovery to a later email address after some time. In that case, keeping this marker
    // will cause errors when a subsequent email change/recovery is attempted.
    ...(userPrivateData.oldEmail ? {} : { oldEmail: currentEmail })
  });

  if (userPrivateData.oldEmail) {
    console.warn(
      `uid ${authUser.uid} already had a saved oldEmail while changing to a new email address. It is possible that something will break here.`
    );
  }

  await sendAccountVerificationEmail(
    newEmail,
    authUser?.displayName,
    verifyAndChangeActionLink,
    userPrivateData.communicationLanguage || 'en',
    'change'
  );
};

/**
 * Admin function for updating an email address.
 */
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

/**
 * Propagate a changed (or recovered) email to services other than Firebase Auth: SendGrid, Stripe and Discourse.
 * The Firebase Auth email change should already have happened at this point.
 *
 * @param {import('../../src/lib/api/functions').PropagateEmailChangeRequest} data
 * @param {string} data - object describing the email change, used for identifying the change to be propagated.
 */
exports.propagateEmailChange = async (data) => {
  const { mode, email: targetEmail } = data;

  if (
    typeof mode !== 'string' ||
    !mode.match(/change|recover/ || typeof targetEmail !== 'string')
  ) {
    fail('invalid-argument');
  }

  // We are not relying on token authentication from the context
  // because valid but authenticated requests can happen when the verification action link is opened on a different, non-logged-in device.
  //
  // The email change should have already occurred in this case
  // - in the email change case, so we get the UID by looking at the new email (now current)
  // - in the email recovery case, se get the UID by looking at the oldEmail (now current)
  // The users-private newEmail property later will prove that an actual email change was requested by this user.
  //
  // '' should not occur, because of the if above (TS can't narrow this yet)
  const targetAuthUser = await auth.getUserByEmail(targetEmail);

  if (!targetAuthUser.emailVerified) {
    console.error(
      'The new (now current) email, or old recovery email, was not verified. This should not be possible in any case when this method is called.'
    );
    fail('failed-precondition');
  }

  const userPrivateRef =
    /** @type {import("firebase-admin/firestore").DocumentReference<UserPrivate>} */ (
      db.doc(`users-private/${targetAuthUser.uid}`)
    );
  const oldUserPrivateData = (await userPrivateRef.get()).data();

  if (!oldUserPrivateData) {
    fail('failed-precondition');
  }

  // Verify the request preconditions
  // The point of this is twofold:
  // - try to prevent race conditions/duplicate work: only one call may service the incomplete request
  // - security/DDoS: make sure that logged-out visitors can not "propagate" (regenerate) emails for any other user's email
  const { newEmail: savedNewEmail, oldEmail: savedOldEmail } = oldUserPrivateData;

  let isValidRequest = false;

  if (mode === 'change' && targetEmail === savedNewEmail) {
    // It is now verified that this user just verified a new email, and needs a propagation
    isValidRequest = true;
    console.log('Valid email change propagation request');
    // Delete the marker for an email change before fully completing the change,
    // in an attempt to prevent other calls to this function from being verified (prevent race conditions).
    await userPrivateRef.update({ newEmail: FieldValue.delete() });
  } else if (mode === 'recover' && targetEmail === savedOldEmail) {
    // It is now verified this user did a verification recently (or multiple) (= proven by the existence of the savedOldEmail),
    // and that this user tried to recover the first old email
    console.log('Valid email recovery propagation request');
    isValidRequest = true;
    // Delete the marker for an email recovery before fully completing the change,
    await userPrivateRef.update({ oldEmail: FieldValue.delete() });
  }

  if (!isValidRequest) {
    console.error(
      'Invald propagation request: trying to propagate a new email address that was not changed in' +
        ' Firebase Auth before the propagation, or is missing from the users-private data.' +
        `\n provided auth email: ${targetAuthUser.email} - provided "${mode}" email: ${targetEmail}`
    );
    fail('failed-precondition');
  }

  // Construct updaters that cross-reference the UID or saved external ID in external systems,
  // and then update the email of the external entities

  const sendgridUpdatePromise = new Promise((resolve) => {
    if (typeof oldUserPrivateData.sendgridId === 'string') {
      updateSendgridContactEmail(targetAuthUser, oldUserPrivateData)
        .then(() => resolve(true))
        .catch((e) => {
          console.error(e);
          // Don't block other update operations on error
          resolve(false);
        });
      return;
    }
    console.warn(
      `UID ${targetAuthUser.uid}, who is changing their email address, does not have a SendGrid contact, we're leaving it that way, as this may be expected.`
    );
    resolve(true);
  });

  const stripeUpdatePromise = new Promise((resolve) => {
    if (typeof oldUserPrivateData.stripeCustomerId !== 'string') {
      // This may very well be expected
      console.warn(
        `UID ${targetAuthUser.uid}, who is changing their email address, does not have a Stripe customer.`
      );
      resolve(false);
      return;
    }
    stripe.customers
      .update(oldUserPrivateData.stripeCustomerId, { email: targetAuthUser.email })
      .then(() => {
        console.info(
          `Stripe customer email for customer ${oldUserPrivateData.stripeCustomerId} updated`
        );
        resolve(true);
      })
      .catch((e) => {
        console.error(
          `An error happened when trying to update the email address of uid ${targetAuthUser.uid} (stripe customer ${oldUserPrivateData.stripeCustomerId}): `,
          e
        );
        resolve(false);
      });
  });

  const discourseUpdatePromise = new Promise((resolve) => {
    updateDiscourseUser(targetAuthUser)
      .then((v) => resolve(v))
      .catch((e) => {
        console.error(
          `An error happened when trying to update the email address of Discourse uid ${targetAuthUser.uid}`,
          e
        );
        resolve(false);
      });
  });

  // Perform all updates
  await Promise.all([sendgridUpdatePromise, stripeUpdatePromise, discourseUpdatePromise]);
};

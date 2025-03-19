const { HttpsError } = require('firebase-functions/v2/https');
const { FieldValue } = require('firebase-admin/firestore');
const fail = require('./util/fail');
const { sendAccountVerificationEmail, sendPasswordResetEmail } = require('./mail');
const { db, auth } = require('./firebase');
const { updateSendgridContactEmail } = require('./sendgrid/updateContactEmail');
const stripe = require('./subscriptions/stripe');
const { updateDiscourseUser } = require('./discourse/updateDiscourseUser');
const { frontendUrl } = require('./sharedConfig');

/**
 * Checks whether the given context represents an admin user.
 *
 * @private
 * TODO: is this going to be used in both v1 and v2 contexts?
 * @param {FV1.CallableContext | FV2.CallableRequest } context
 * @throws when the context is not representing an admin
 * @returns {Promise<UserRecord>} adminUser
 */
async function verifyAdminUser(context) {
  if (!context.auth) {
    fail('unauthenticated');
  }

  const { uid } = context.auth;
  if (!uid) {
    fail('invalid-argument');
  }
  const adminUser = await auth.getUser(uid);
  if (!adminUser.customClaims || !adminUser.customClaims.admin) {
    fail('permission-denied');
  }
  return adminUser;
}

exports.verifyAdminUser = verifyAdminUser;

/**
 * @param {string} email
 * @param {string} firstName
 * @param {string} language
 */
const sendVerificationEmail = async (email, firstName, language) => {
  // https://firebase.google.com/docs/auth/admin/email-action-links#generate_email_verification_link
  // https://firebase.google.com/docs/auth/custom-email-handler
  const link = await auth.generateEmailVerificationLink(email, {
    url: `${frontendUrl()}/account`
  });

  await sendAccountVerificationEmail(email, firstName, link, language);
};
exports.sendVerificationEmail = sendVerificationEmail;

/**
 * @public
 * @param {FV2.CallableRequest<string>} request
 */
exports.requestPasswordReset = async (request) => {
  const email = request.data;
  if (!email) fail('invalid-argument');

  try {
    const exists = await auth.getUserByEmail(email);
    if (!exists) return { message: 'Password reset request received', success: true };
    const link = await auth.generatePasswordResetLink(email, {
      url: `${frontendUrl()}/reset-password`
    });

    const user = await auth.getUserByEmail(email);
    await sendPasswordResetEmail(email, user.displayName, link);

    return { message: 'Password reset request received', success: true };
  } catch (e) {
    fail('invalid-argument');
  }
};

/**
 * @public
 * @param {FV2.CallableRequest} request
 */
exports.resendAccountVerification = async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '');
  }

  /** @type {UserRecord | null} */
  let user = null;
  /** @type {UserPrivate | null} */
  let userPrivate = null;
  try {
    const [userIn, userPrivateIn] = await Promise.all([
      auth.getUser(request.auth.uid),
      /** @type {Promise<UserPrivate>} */ (
        db
          .doc(`users-private/${request.auth.uid}`)
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
    throw new HttpsError('permission-denied', '');
  }

  if (!user || user.emailVerified) throw new HttpsError('permission-denied', '');
  if (!user.email) throw new HttpsError('invalid-argument', '');

  await sendVerificationEmail(
    user.email,
    // Empty string shouldn't occur, as we make it mandatory and set it on user creation.
    user.displayName ?? '',
    userPrivate.communicationLanguage ?? 'en'
  );
};

/**
 * Admin function to set the admin status of the given email address.
 *
 * @public
 * @param {FV2.CallableRequest<{newStatus: boolean, email: string}>} request
 */
exports.setAdminRole = async (request) => {
  const { data } = request;
  await verifyAdminUser(request);

  const { newStatus } = data;
  const user = await auth.getUserByEmail(data.email);
  await auth.setCustomUserClaims(user.uid, { admin: newStatus });

  return { message: `${data.email} admin status set successfully.` };
};

/**
 * Admin function to force the verification of an email.
 * The normal verification process starts in createUser.
 *
 * @public
 * @param {FV2.CallableRequest} request
 */
exports.verifyEmail = async (request) => {
  await verifyAdminUser(request);
  const { email } = request.data;

  const userToUpdate = await auth.getUserByEmail(email);
  await auth.updateUser(userToUpdate.uid, {
    emailVerified: true
  });
  return { message: `${email} was verified` };
};

/**
 * Utility method. See requestEmailChange.
 * @private
 */
async function requestEmailChangeForUser(authUser, newEmail) {
  const currentEmail = authUser.email;
  const userPrivateRef = /** @type {DocumentReference<UserPrivate>} */ (
    db.doc(`users-private/${authUser.uid}`)
  );
  const userPrivateData = (await userPrivateRef.get()).data();

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
}

/**
 * User-callable function to request an email change. Will trigger a verification
 * email to be sent to the new email. After the verification link is clicked, the
 * change will be finalized, and Firebase will trigger a recovery email (in English)
 * to be sent to the old email.
 *
 * @public
 * @param {FV2.CallableRequest} request
 */
exports.requestEmailChange = async (request) => {
  if (!request.auth) {
    fail('unauthenticated');
  }
  const newEmail = request.data;
  const authUser = await auth.getUser(request.auth.uid);

  await requestEmailChangeForUser(authUser, newEmail);
};

/**
 * Forces the Firebase email of the account of oldEmail to be updated to newEmail.
 *
 * In contrast to other methods, this does NOT send a verification email to newEmail,
 * and it does also NOT send a recovery email to the oldEmail.
 *
 * @private
 * @param {UserRecord} userToUpdate
 * @param {string} newEmail
 */
async function forceUpdateFirebaseEmail(userToUpdate, newEmail) {
  await auth.updateUser(userToUpdate.uid, {
    email: newEmail,
    emailVerified: true
  });
}

/**
 * Forces email updates in services like SendGrid, Stripe and Discourse for the given user.
 * The external user accounts to be updated are determined from the oldUserPrivateData (sendgridId), or targetAuthUser (uid)
 * The email already needs to be changed (with its new value in targetAuthUser) when this method is called!
 *
 * @private
 * @param {UserPrivate} userPrivateData
 * @param {UserRecord} targetAuthUser
 */
async function syncUserEmailToExternalSystems(userPrivateData, targetAuthUser) {
  const sendgridUpdatePromise = new Promise((resolve) => {
    if (typeof userPrivateData.sendgridId === 'string') {
      updateSendgridContactEmail(targetAuthUser, userPrivateData)
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
    if (typeof userPrivateData.stripeCustomerId !== 'string') {
      // This may very well be expected
      console.warn(
        `UID ${targetAuthUser.uid}, who is changing their email address, does not have a Stripe customer.`
      );
      resolve(false);
      return;
    }
    stripe.customers
      .update(userPrivateData.stripeCustomerId, { email: targetAuthUser.email })
      .then(() => {
        console.info(
          `Stripe customer email for customer ${userPrivateData.stripeCustomerId} updated`
        );
        resolve(true);
      })
      .catch((e) => {
        console.error(
          `An error happened when trying to update the email address of uid ${targetAuthUser.uid} (stripe customer ${userPrivateData.stripeCustomerId}): `,
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
}

/**
 * Admin function for updating an email address.
 * If oldEmail equals newEmail, the email will still be propagated in other systems than Firebase,
 * this is useful when the email was previously changed in Firebase (manually), but this change was not propagated.
 *
 * @public
 * @param {FV2.CallableRequest<{oldEmail: string, newEmail: string, force?: boolean}>} request
 */
exports.updateEmail = async (request) => {
  await verifyAdminUser(request);
  const { oldEmail, newEmail, force = false } = request.data;

  const userToChange = await auth.getUserByEmail(oldEmail);
  if (force) {
    const userPrivateRef = /** @type {DocumentReference<UserPrivate>} */ (
      db.doc(`users-private/${userToChange.uid}`)
    );
    const oldUserPrivateData = (await userPrivateRef.get()).data();
    if (!oldUserPrivateData) {
      fail('failed-precondition');
    }

    /** @type {UserRecord} */
    let userToPropagate;

    if (oldEmail !== newEmail) {
      console.log(`Force-updating ${oldEmail} (${userToChange.uid}) to ${newEmail}`);
      // Inequality means a proper, full, forced email update
      // Apply the email change in Firebase
      await forceUpdateFirebaseEmail(userToChange, newEmail);
      // Refetch the auth details (incl. new email)
      userToPropagate = await auth.getUser(userToChange.uid);
    } else {
      // The old and new emails are equal.
      console.log(`Force-propagating ${oldEmail} to other systems`);
      // We will not do a Firebase email change,
      // but we will still propagate the email change.
      // This method can be used to propagate the email change of a user that was
      // manually updated in Firebase.
      userToPropagate = userToChange;
    }
    // Propagate the change to other systems
    await syncUserEmailToExternalSystems(oldUserPrivateData, userToPropagate);
  } else {
    console.log(`Manually requesting an email change from ${oldEmail} to ${newEmail}`);
    // Don't force the change.
    // Propagation will occur naturally when the user clicks the verification link
    await requestEmailChangeForUser(userToChange, newEmail);
  }
  return { message: `${oldEmail} was changed to ${newEmail}` };
};

/**
 * Propagate a changed (or recovered) email to services other than Firebase Auth: SendGrid, Stripe and Discourse.
 * The Firebase Auth email change should already have happened at this point.
 *
 * Verifies whether the request is valid using markers left in the targetEmail's users-private data
 *
 * @param {FV2.CallableRequest<import('../../src/lib/api/functions').PropagateEmailChangeRequest>} request
 */
exports.propagateEmailChange = async (request) => {
  const { mode, email: targetEmail } = request.data;

  if (
    typeof mode !== 'string' ||
    !mode.match(/change|recover/) ||
    typeof targetEmail !== 'string'
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

  const userPrivateRef = /** @type {DocumentReference<UserPrivate>} */ (
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

  await syncUserEmailToExternalSystems(oldUserPrivateData, targetAuthUser);
};

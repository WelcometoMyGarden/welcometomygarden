/* eslint-disable camelcase */
// @ts-check
// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
// eslint-disable-next-line import/no-unresolved
const { getAuth } = require('firebase-admin/auth');
const functions = require('firebase-functions');
const sendgridClient = require('@sendgrid/client');
const { setTimeout } = require('node:timers/promises');
const countries = require('./countries');
const fail = require('./util/fail');
const { sendAccountVerificationEmail, sendPasswordResetEmail } = require('./mail');
const removeEndingSlash = require('./util/removeEndingSlash');

/**
 * @typedef {import("../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

const db = getFirestore();
const auth = getAuth();

const SG_MARKETING_KEY = functions.config().sendgrid.marketing_key;
if (SG_MARKETING_KEY) {
  sendgridClient.setApiKey(SG_MARKETING_KEY);
}

/**
 * @type {string}
 */
const SG_WTMG_NEWS_YES_ID = functions.config().sendgrid.newsletter_list_id;
const {
  wtmg_id: SG_WTMG_ID_FIELD_ID,
  superfan: SENDGRID_SUPERFAN_FIELD_ID,
  communication_language: SG_COMMUNICATION_LANG_FIELD_ID,
  // NOTE: For lat_sign_in_time to be representative, we need to update this when somebody logs in.
  // Takes some more setup:
  // https://stackoverflow.com/questions/46452921/can-cloud-functions-for-firebase-execute-on-user-login
  // last_sign_in_time: SG_LAST_SIGN_IN_TIME_FIELD_ID,
  creation_time: SG_CREATION_TIME_FIELD_ID
} = /** @type {{[key: string]: string}} */ (functions.config().sendgrid.field_ids ?? {});

const frontendUrl = removeEndingSlash(functions.config().frontend.url);

const sendVerificationEmail = async (email, firstName) => {
  // https://firebase.google.com/docs/auth/admin/email-action-links#generate_email_verification_link
  // https://firebase.google.com/docs/auth/custom-email-handler
  const link = await auth.generateEmailVerificationLink(email, {
    url: `${frontendUrl}/account`
  });

  await sendAccountVerificationEmail(email, firstName, link);
};

exports.createUser = async (data, context) => {
  if (!context.auth) {
    fail('unauthenticated');
  }

  try {
    const existingUser = await db.collection('users').doc(context.auth.uid).get();
    if (existingUser.exists) fail('already-exists');

    if (!data.firstName || !data.lastName) fail('invalid-argument');
    if (
      typeof data.firstName !== 'string' ||
      typeof data.lastName !== 'string' ||
      data.firstName.trim().length === 0 ||
      data.lastName.trim().length === 0 ||
      data.firstName.trim().length > 25 ||
      data.lastName.trim().length > 50
    ) {
      fail('invalid-argument');
    }
    if (!data.countryCode) fail('invalid-argument');
    if (typeof data.countryCode !== 'string' || !Object.keys(countries).includes(data.countryCode))
      fail('invalid-argument');

    const normalizeName = (name) => {
      const normalized = name.trim().toLowerCase();
      // TODO remove diacritics
      return normalized.replace(/\b(\w)/g, (s) => s.toUpperCase());
    };

    const firstName = normalizeName(data.firstName);
    const lastName = normalizeName(data.lastName);

    const user = await auth.getUser(context.auth.uid);
    const { email } = user;

    const hasClaimableGarden = await db.collection('tmp-users').where('email', '==', email).get();

    let claimantId = false;
    if (!hasClaimableGarden.empty) {
      const snapshot = hasClaimableGarden.docs[0];
      claimantId = snapshot.id;

      const existingGardenSnap = await db.collection('campsites').doc(claimantId).get();
      const existingGarden = existingGardenSnap.data();

      await db
        .collection('campsites')
        .doc(user.uid)
        .set({ ...existingGarden, unclaimed: false, photo: null, previousPhotoId: claimantId });
      await db.collection('campsites').doc(claimantId).delete();
      await db.collection('users').doc(claimantId).delete();
      await db.collection('tmp-users').doc(claimantId).delete();
    }

    await auth.updateUser(user.uid, { displayName: firstName });

    await db.collection('users').doc(user.uid).set({
      countryCode: data.countryCode,
      firstName
      // NOTE: for new accounts, we are not setting defaults for `superfan` (false) here
      // or other properties defined in src/lib/models/Users.ts -> UserPublic
      // A data migration was run only for new existing accounts in November/December 2022.
    });

    await db
      .collection('users-private')
      .doc(user.uid)
      .set({
        lastName,
        // Consent can be assumed here, because on the frontend, the registration form does not
        // submit without the consent checkbox being set.
        // This is essentially a mirror the creation timestamp of the users-private doc
        consentedAt: FieldValue.serverTimestamp(),
        emailPreferences: {
          newChat: true,
          news: true
        }
        // NOTE: there are several other properties that don't have defaults, see
        // src/lib/models/Users.ts -> UserPrivate
      });

    await db
      .collection('stats')
      .doc('users')
      .set({ count: FieldValue.increment(1) }, { merge: true });

    await sendVerificationEmail(email, firstName);

    return { message: 'Your account was created successfully,', success: true };
  } catch (ex) {
    console.error(
      'Something went wrong while creating the user, or sending the verification email. ' +
        'The user will be deleted',
      ex
    );
    // TODO: instead of deleting here, use a transaction that can be rolled back (if possible).
    await auth.deleteUser(context.auth.uid);
    return ex;
  }
};

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
    throw new functions.https.HttpsError('unauthenticated');
  }

  let user;
  try {
    user = await auth.getUser(context.auth.uid);
  } catch (ex) {
    console.log(
      'Exception while trying to get the user while resending the account verification email',
      ex
    );
    throw new functions.https.HttpsError('permission-denied');
  }

  if (!user || user.emailVerified) throw new functions.https.HttpsError('permission-denied');

  await sendVerificationEmail(user.email, user.displayName);
};

/**
 * @param {UserRecord} user
 */
exports.cleanupUserOnDelete = async (user) => {
  const userId = user.uid;

  // Delete the connected SendGrid contact
  /** @type {UserPrivate | undefined} */
  let userPrivate;
  try {
    userPrivate =
      /** @type {UserPrivate} */
      ((await db.doc(`users-private/${userId}`).get()).data());
  } catch (e) {
    console.error(`Couldn't fetch users-private data while cleaning up deleted user ${user.uid}`);
  }

  if (typeof userPrivate === 'undefined' || !userPrivate.sendgridId) {
    console.error(`No sendgridId recorded for user to be deleted: ${user.uid}`);
  } else {
    try {
      await sendgridClient.request({
        url: `/v3/marketing/contacts`,
        method: 'DELETE',
        qs: {
          ids: userPrivate.sendgridId
        }
      });
    } catch (e) {
      console.error(
        `Something went wrong while deleting the contact ${userPrivate.sendgridId} of Firebase user ${user.uid}`,
        e
      );
    }
  }

  const batch = db.batch();

  // TODO: why doesn't this delete from the "users" collection?
  // Is their first name still used in chats or something that are not deleted?
  // What happens with the garden link in this case?
  // To be tested.
  batch.delete(db.doc(`campsites/${userId}`));
  batch.delete(db.doc(`users-private/${userId}`));

  try {
    await batch.commit();
    await db
      .collection('stats')
      .doc('users')
      .set({ count: FieldValue.increment(-1) }, { merge: true });
  } catch (ex) {
    console.error(ex);
  }
};

/**
 * Add a contact for this user to SendGrid, and store its contact ID
 * in the user's users-private doc.
 * Precondition: the user's users-private document must already exist
 * @param {UserRecord} user
 * @param {object} [extraContactDetails]
 * @returns
 */
const createSendgridContact = async (user, extraContactDetails = {}) => {
  if (!user.email) {
    console.error('New Firebase users must always have an email address');
    fail('invalid-argument');
    return;
  }
  const sendgridContactCreationDetails = {
    email: user.email,
    // Set to first name on creation
    first_name: user.displayName,
    ...extraContactDetails,
    custom_fields: {
      [SG_WTMG_ID_FIELD_ID]: user.uid,
      [SG_CREATION_TIME_FIELD_ID]: new Date(user.metadata.creationTime).toISOString(),
      ...(extraContactDetails.custom_fields ?? {})
    }
  };

  // Create the contact in SG
  /**
   * @type {string | undefined}
   */
  let contactCreationJobId;
  try {
    const [{ statusCode }, { job_id }] = await sendgridClient.request({
      url: '/v3/marketing/contacts',
      method: 'PUT',
      body: {
        // Inclusion assumed on creation, for now.
        list_ids: [SG_WTMG_NEWS_YES_ID],
        contacts: [sendgridContactCreationDetails]
      }
    });
    if (statusCode !== 202) {
      console.error('Unexpected non-erroring SendGrid response when creating a new contact');
      fail('internal');
      return;
    }
    contactCreationJobId = job_id;
  } catch (e) {
    console.error(JSON.stringify(e));
    fail('internal');
    return;
  }
  // Poll for the status of the creation via its job_id
  /**
   * @type {string | undefined}
   */

  if (!contactCreationJobId) {
    console.error('Missing SendGrid job ID when creating a new contact');
    fail('internal');
    return;
  }
  /** @type {'pending'|'completed'|'errored'|'failed'} */
  let status = 'pending';
  const MAX_ITERATIONS = 30;
  let currentIteration = 0;
  while (status === 'pending' && currentIteration < MAX_ITERATIONS) {
    // eslint-disable-next-line no-await-in-loop
    await setTimeout(2000);
    // Check for the statustoISOString
    const [
      response,
      {
        status: latestStatus,
        results: { errored_count, updated_count }
      }
      // eslint-disable-next-line no-await-in-loop
    ] = await sendgridClient.request({
      url: `/v3/marketing/contacts/imports/${contactCreationJobId}`,
      method: 'GET'
    });

    // It more than a minute before 'pending' becomes 'completed' or something else
    // but intermediary results should be enough for us to know the actual status
    // They come more quickly
    if (errored_count === 1) {
      status = 'failed';
    } else if (updated_count === 1) {
      status = 'completed';
    } else {
      status = latestStatus;
    }

    currentIteration += 1;
  }

  if (currentIteration === MAX_ITERATIONS) {
    console.error(`SendGrid's contact creation job did not complete in a reasonable time`);
    fail('internal');
    return;
  }

  if (status !== 'completed') {
    console.error(`Unexpected SendGrid job status ${status}`);
    fail('internal');
  }

  const [{ statusCode: getIdStatusCode }, { result, errors }] = await sendgridClient.request({
    url: '/v3/marketing/contacts/search/emails',
    method: 'POST',
    body: {
      emails: [user.email]
    }
  });

  if (getIdStatusCode !== 200 || errors) {
    console.error('Something went wrong while getting the SendGrid contact ID', errors);
    fail('internal');
  }
  if (!result || !(user.email && user.email in result)) {
    console.log('Contact not found in SendGrid!');
    fail('internal');
  }

  // Add the sendgrid contact ID to firebase
  const { id: contactId } = result[user.email].contact;

  await db.doc(`users-private/${user.uid}`).update({
    sendgridId: contactId
  });
};

/*
 * JSDOC TS types note: this won't work:
 * @//param {Change<DocumentSnapshot>} change
 *
 * See https://github.com/microsoft/TypeScript/issues/27387
 */

/**
 * @typedef {import("@google-cloud/firestore").DocumentSnapshot<UserPrivate>} UserPrivateDocumentSnapshot
 * @param {import("firebase-functions").Change<UserPrivateDocumentSnapshot>} change
 * @returns {Promise<any>}
 */
exports.onUserPrivateWrite = async (change) => {
  if (!SG_MARKETING_KEY) {
    console.log('onUserPrivateWrite: No SG marketing key');
    return;
  }

  // TODO: current problematic situation
  // 1. the initial createUser call calls this first.
  // 2. This results in a call to createSendgridContact, which takes about 32 seconds
  // 3. ! While createSendgridContact is still polling createSendgridContact, communicationLanguage gets updated (or any other prop may get updated)
  // 4. ! this restarts the call from 2, because the sendgridId is still undefined. THIS DOES A REDUNDANT 32 SEC UPDATE
  // 5. The call from (2) triggers another update, which returns in 2ms no-op because of the installed guard
  // 6. The call from (4) triggers another update, which probably results in a normal update because the guard does not apply anymore
  //
  // Can we avoid this situation?
  //
  // We could make sure that (3) doesn't happen by setting communicationLanguage on account create, as a createUser param (this is good in any case)
  //
  // Even more robust: a way to make sure that whichever changes DO happen in those 30 seconds, won't cause a redundant update.
  // - create the sendgrid account in the createUser function: unacceptable, because it would delay account creation (already slow) with 30 sec
  //    we have to await the polling, because the function thread might be force-terminated after returning https://stackoverflow.com/a/51802305/4973029
  // - ! calling another cloud function from createUser, that can complete on its own, and just does the update?
  //    https://stackoverflow.com/questions/58362694/how-to-call-cloud-function-inside-another-cloud-function-and-pass-some-input-par
  //    pubsub or http? not oncall?
  //     pubsub looks promising, because the publisher is just that (publisher), and not a caller that needs to await a response
  //      - -> simple demo: https://blog.minimacode.com/publish-message-to-pubsub-emulator/
  //      - https://firebase.google.com/docs/functions/pubsub-events
  //      - https://cloud.google.com/pubsub/docs/publish-receive-messages-client-library#node.js_1
  //      - https://medium.com/@r_dev/using-pub-sub-in-firebase-emulator-3d4b897d2441
  //      - https://www.reddit.com/r/Firebase/comments/mfu8k6/how_do_i_publish_messages_with_the_pubsub/
  // - webhooks? don't exist for contact creation
  //   https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook
  // - using another firestore collection's doc to track whether we are polling for this uid or not...

  const { before, after } = change;

  // console.log('before ', JSON.stringify(before.data(), null, 2));
  // console.log('after ', JSON.stringify(after.data(), null, 2));

  // We are only interested in:
  // - creation events (!before.exists)
  // - update event (before.exists)
  // In both cases, after.exists should hold.
  if (!after.exists) {
    return;
  }

  // Extract users-private data
  const userPrivateAfter = after.data();

  if (!userPrivateAfter) {
    // Should not hapen, if after.exists it should have data.
    fail('internal');
    // For TS type narrowing, actually unreachable code because fail always throws.
    throw new Error('userPrivate does not have data, it should.');
  }

  /**
   * @type {UserPrivate | undefined} userPrivateBefore
   */
  let userPrivateBefore;
  // Ignore the recursive case where the sendgridId was just added by code below
  if (before.exists) {
    userPrivateBefore = before.data();
    if (userPrivateBefore && !userPrivateBefore.sendgridId && !!userPrivateAfter.sendgridId) {
      return;
    }
  }

  // Create or update a SendGrid contact for this user
  const authUser = await auth.getUser(after.id);
  const { lastName, communicationLanguage, sendgridId } = userPrivateAfter;
  const sendgridContactUpdateFields = {
    email: authUser.email,
    last_name: lastName,
    custom_fields: {
      [SG_COMMUNICATION_LANG_FIELD_ID]: communicationLanguage
    }
  };

  if (!sendgridId) {
    // No recorded sendgridID means that we first have to create the contact
    // This will "recursively" trigger another userPrivate write, which will
    // match the ignore case above.
    await createSendgridContact(authUser, sendgridContactUpdateFields);
  } else {
    // Otherwise, this is an update of changed information

    // Check if we should do a list addition
    /**
     * @type {string[] | undefined}
     */
    let list_ids;
    if (
      userPrivateBefore &&
      userPrivateBefore.emailPreferences &&
      userPrivateBefore.emailPreferences.news === false &&
      userPrivateAfter &&
      userPrivateAfter.emailPreferences &&
      userPrivateAfter.emailPreferences.news === true
    ) {
      list_ids = [SG_WTMG_NEWS_YES_ID];
    }
    try {
      await sendgridClient.request({
        url: '/v3/marketing/contacts',
        method: 'PUT',
        body: {
          ...(list_ids ? { list_ids } : {}),
          contacts: [sendgridContactUpdateFields]
        }
      });
    } catch (e) {
      console.error(JSON.stringify(e));
      fail('internal');
    }

    // Check if we should do a list deletion
    if (
      userPrivateBefore &&
      userPrivateBefore.emailPreferences &&
      userPrivateBefore.emailPreferences.news === true &&
      userPrivateAfter &&
      userPrivateAfter.emailPreferences &&
      userPrivateAfter.emailPreferences.news === false
    ) {
      await sendgridClient.request({
        url: `/v3/marketing/lists/${SG_WTMG_NEWS_YES_ID}/contacts`,
        method: 'DELETE',
        qs: {
          contact_ids: sendgridId
        }
      });
    }
  }

  // In case of deletion, do nothing.
  // cleanupUserOnDelete handles this.
};

/**
 * @typedef {import("@google-cloud/firestore").DocumentSnapshot<UserPublic>} UserPublicDocumentSnapshot
 * @param {import("firebase-functions").Change<UserPublicDocumentSnapshot>} change
 * @returns {Promise<any>}
 */
exports.onUserWrite = async (change) => {
  if (!SG_MARKETING_KEY) {
    console.log('onUserWrite: No SG marketing key');
    return;
  }

  const { after } = change;

  if (!after.exists) {
    fail('invalid-argument');
    return;
  }

  // We now have a:
  // Creation event (!before.exists)
  // OR Update event (before.exists)

  const userPublic = after.data();

  if (!userPublic) {
    fail('internal');
    return;
  }

  const { firstName, superfan, countryCode } = userPublic;

  const authUser = await auth.getUser(after.id);
  const sendgridContact = {
    email: authUser.email,
    first_name: firstName,
    country: countryCode,
    custom_fields: {
      // Because only numbers & text are supported as data types, not
      // (not sure how they appear in "JSON" data exports though)
      [SENDGRID_SUPERFAN_FIELD_ID]: superfan ? 1 : 0
    }
  };
  await sendgridClient.request({
    url: '/v3/marketing/contacts',
    method: 'PUT',
    body: {
      contacts: [sendgridContact]
    }
  });
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

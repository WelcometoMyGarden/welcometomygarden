// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
// eslint-disable-next-line import/no-unresolved
const { getAuth } = require('firebase-admin/auth');
const functions = require('firebase-functions');
const countries = require('./countries');
const fail = require('./util/fail');
const { sendAccountVerificationEmail, sendPasswordResetEmail } = require('./mail');
const removeEndingSlash = require('./util/removeEndingSlash');

const db = getFirestore();
const auth = getAuth();

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

exports.cleanupUserOnDelete = async (user) => {
  const userId = user.uid;

  const batch = db.batch();

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

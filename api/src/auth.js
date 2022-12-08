const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const functions = require('firebase-functions');
const countries = require('./countries');
const fail = require('./util/fail');

const { sendAccountVerificationEmail, sendPasswordResetEmail } = require('./mail');

const db = getFirestore();
const auth = getAuth();


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
    });

    await db
      .collection('users-private')
      .doc(user.uid)
      .set({
        lastName,
        consentedAt: FieldValue.serverTimestamp(),
        emailPreferences: {
          newChat: true,
          news: true
        }
      });

    await db
      .collection('stats')
      .doc('users')
      .update({ count: FieldValue.increment(1) });

    const link = await auth.generateEmailVerificationLink(email, {
      url: `${functions.config().frontend.url}/account`
    });

    await sendAccountVerificationEmail(user.email, firstName, link);

    return { message: 'Your account was created successfully,', success: true };
  } catch (ex) {
    console.log(ex);
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
      url: `${functions.config().frontend.url}/reset-password`
    });

    const user = await auth.getUserByEmail(email);
    await sendPasswordResetEmail(email, user.displayName, link);

    return { message: 'Password reset request received', success: true };
  } catch (ex) {
    throw new functions.https.HttpsError('invalid-argument');
  }
};

exports.changeEmail = async () => { };

exports.resendAccountVerification = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated');
  }

  let user;
  try {
    user = await auth.getUser(context.auth.uid);
  } catch (ex) {
    console.log(ex);
    throw new functions.https.HttpsError('permission-denied');
  }

  if (!user || user.emailVerified) throw new functions.https.HttpsError('permission-denied');

  const link = await auth.generateEmailVerificationLink(user.email, {
    url: `${functions.config().frontend.url}/account`
  });
  await sendAccountVerificationEmail(user.email, user.displayName, link);
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
      .update({ count: FieldValue.increment(-1) });
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

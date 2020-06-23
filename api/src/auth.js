const admin = require('firebase-admin');
const functions = require('firebase-functions');
const countries = require('./countries');
const { sendAccountVerificationEmail, sendPasswordResetEmail } = require('./mail');

exports.createUser = async (data, context) => {
  const fail = (code) => {
    throw new functions.https.HttpsError(code);
  };

  if (!context.auth) {
    fail('unauthenticated');
  }

  try {
    const db = admin.firestore();

    const existingUser = await db.collection('users').doc(context.auth.uid).get();
    if (existingUser.exists) fail('already-exists');

    if (!data.firstName || !data.lastName) fail('invalid-argument');
    if (
      typeof data.firstName !== 'string' ||
      typeof data.lastName !== 'string' ||
      data.firstName.trim().length === 0 ||
      data.lastName.trim().length === 0
    ) {
      fail('invalid-argument');
    }
    if (!data.countryCode) fail('invalid-argument');
    if (typeof data.countryCode !== 'string' || !Object.keys(countries).includes(data.countryCode))
      fail('invalid-argument');

    const normalizeName = (name) => {
      const normalized = name.trim().toLowerCase();
      return normalized.replace(/\b(\w)/g, (s) => s.toUpperCase());
    };

    const firstName = normalizeName(data.firstName);
    const lastName = normalizeName(data.lastName);

    const auth = admin.auth();
    const user = await auth.getUser(context.auth.uid);
    const { email } = user;

    await auth.updateUser(user.uid, { displayName: firstName });

    await db.collection('users').doc(user.uid).set({
      countryCode: data.countryCode,
      firstName: data.firstName
    });

    await db
      .collection('users-private')
      .doc(user.uid)
      .set({
        lastName,
        emailPreferences: {
          newChat: true,
          news: true
        }
      });

    const link = await admin.auth().generateEmailVerificationLink(email, {
      url: `${functions.config().frontend.url}/account`
    });

    await sendAccountVerificationEmail(user.email, firstName, link);

    return { message: 'Your account was created successfully,', success: true };
  } catch (ex) {
    console.log(ex);
    await admin.auth().deleteUser(context.auth.uid);
    return ex;
  }
};

exports.requestPasswordReset = async (email) => {
  if (!email) throw new functions.https.HttpsError('invalid-argument');

  try {
    const auth = admin.auth();
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

exports.changeEmail = async () => {};

exports.resendAccountVerification = async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated');
  }

  const auth = admin.auth();

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

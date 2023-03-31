// @ts-check
// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { FieldValue } = require('firebase-admin/firestore');
const countries = require('../countries');
const fail = require('../util/fail');
const { sendVerificationEmail } = require('../auth');
const { auth, db } = require('../firebase');

/**
 * @typedef {import("../../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

/**
 * @param {import('../../../src/lib/api/functions').CreateUserRequest} data
 * @param {import('firebase-functions/v1/https').CallableContext} context
 * @returns {Promise<object>}
 */
exports.createUser = async (data, context) => {
  if (!context.auth) {
    return fail('unauthenticated');
  }

  if (!context.auth.uid) {
    return fail('internal');
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

    await auth.updateUser(user.uid, { displayName: firstName });

    await db.collection('users').doc(user.uid).set({
      countryCode: data.countryCode,
      firstName
      // NOTE: for new accounts, we are not setting defaults for `superfan` (false) here
      // or other properties defined in src/lib/models/Users.ts -> UserPublic
      // A data migration was run only for new existing accounts in November/December 2022.
    });

    const userPrivateRef =
      /** @type {import('firebase-admin/firestore').DocumentReference<UserPrivate>} */ (
        db.collection('users-private').doc(user.uid)
      );
    await userPrivateRef.set({
      lastName,
      // Consent can be assumed here, because on the frontend, the registration form does not
      // submit without the consent checkbox being set.
      // This is essentially a mirror the creation timestamp of the users-private doc
      consentedAt: FieldValue.serverTimestamp(),
      emailPreferences: {
        newChat: true,
        news: true
      },
      creationLanguage: data.communicationLanguage,
      communicationLanguage: data.communicationLanguage
      // NOTE: there are several other properties that don't have defaults, see
      // src/lib/models/Users.ts -> UserPrivate
    });

    await db
      .collection('stats')
      .doc('users')
      .set({ count: FieldValue.increment(1) }, { merge: true });

    await sendVerificationEmail(email, firstName, data.communicationLanguage);

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

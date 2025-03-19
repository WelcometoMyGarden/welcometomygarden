const { FieldValue } = require('firebase-admin/firestore');
const countries = require('../countries');
const fail = require('../util/fail');
const { sendVerificationEmail } = require('../auth');
const { auth, db } = require('../firebase');
const { logger } = require('firebase-functions/v2');

/**
 * Callable function to create the required Firestore user documents for a newly created
 * account in Firebase Auth.
 *
 * @param {FV2.CallableRequest<import('../../../src/lib/api/functions').CreateUserRequest>} request
 * @returns {Promise<object>}
 */
exports.createUser = async ({ data, auth: authContext }) => {
  if (!authContext) {
    logger.error('Failed to create a user, no auth context present');
    fail('unauthenticated');
  }

  if (!authContext.uid) {
    logger.error('Failed to create a user, no uid present in the auth context');
    fail('internal');
  }

  const { uid } = authContext;

  try {
    const existingUser = await db.collection('users').doc(authContext.uid).get();
    if (existingUser.exists) {
      logger.error('The user that we tried to create already as a public doc', {
        uid
      });
      fail('already-exists');
    }

    if (!data.firstName || !data.lastName) {
      logger.error('Missing first name or last name to create a new user', {
        firstName: data.firstName,
        lastName: data.lastName,
        uid
      });
      fail('invalid-argument');
    }

    if (
      typeof data.firstName !== 'string' ||
      typeof data.lastName !== 'string' ||
      data.firstName.trim().length === 0 ||
      data.lastName.trim().length === 0 ||
      data.firstName.trim().length > 25 ||
      data.lastName.trim().length > 50
    ) {
      logger.error('First name or last name data does not pass validations', {
        uid,
        firstName: data.firstName,
        lastName: data.lastName
      });
      fail('invalid-argument');
    }

    if (!data.countryCode) {
      logger.error('Missing countryCode', {
        uid
      });
      fail('invalid-argument');
    }

    if (
      typeof data.countryCode !== 'string' ||
      !Object.keys(countries).includes(data.countryCode)
    ) {
      logger.error('Country code does not pass validations', {
        countryCode: data.countryCode
      });
      fail('invalid-argument');
    }

    /**
     * @param {string} name
     * @returns {string}
     */
    const normalizeName = (name) => {
      // - We're not fully lowercasing input, because of names like McDonald
      // - We're also not removing diacritics.
      // - Caveat: the special character rule could lead to unintended effects, depending on the user's preference
      //   (d'Hont, D'hont, ... will now all be D'Hont)
      //   However - the previous code also did this, so we're staying consistent this way.
      //
      // Uppercase the non-space letter following a line start, spacing, or a special character
      const specialChars = '[-_\\(\\)\'"`´\\./]';
      const capitalizerReg = new RegExp(`(?:^|\\s|${specialChars})(\\S)`, 'g');
      return (
        name
          .trim()
          .replace(capitalizerReg, (s) => s.toUpperCase())
          // The above capitalizer will also capitalize "and" between spaces, reset this.
          .replace(/\s(and|et|und|ve|e|i|en|y|och|og|in|für)\s/gi, (s) => s.toLowerCase())
      );
    };

    const firstName = normalizeName(data.firstName);
    const lastName = normalizeName(data.lastName);

    const user = await auth.getUser(uid);
    const { email } = user;

    await auth.updateUser(user.uid, { displayName: firstName });

    await db.collection('users').doc(user.uid).set({
      countryCode: data.countryCode,
      firstName
      // NOTE: for new accounts, we are not setting defaults for `superfan` (false) here
      // or other properties defined in src/lib/models/Users.ts -> UserPublic
      // A data migration was run only for new existing accounts in November/December 2022.
    });

    const userPrivateRef = /** @type {DocumentReference<UserPrivate>} */ (
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
      communicationLanguage: data.communicationLanguage,
      // NOTE: there are several other properties that don't have defaults, see
      // src/lib/models/Users.ts -> UserPrivate
      // Optional reference field
      ...(data.reference && typeof data.reference === 'string' && data.reference.length > 0
        ? {
            reference: data.reference
          }
        : {})
    });

    await db
      .collection('stats')
      .doc('users')
      .set({ count: FieldValue.increment(1) }, { merge: true });

    if (!email) {
      logger.error(
        `The email for UID ${user.uid} was not set when trying to send its verification email.`
      );
    } else {
      await sendVerificationEmail(email, firstName, data.communicationLanguage);
    }

    return { message: 'Your account was created successfully,', success: true };
  } catch (ex) {
    logger.error(
      `Something went wrong while creating the user ${uid}, or sending the verification email. ` +
        'The user will be deleted',
      ex
    );
    // TODO: instead of deleting here, use a transaction that can be rolled back (if possible).
    await auth.deleteUser(uid);
    // TODO: the **return** here (and not throw) will always make the callable succeed
    // (except if no auth context is present, see the first fail conditions)
    // Probably this leads to no error being logged or shown in the frontend, but just endless waiting.
    return ex;
  }
};

const { FieldValue } = require('firebase-admin/firestore');
const countries = require('../countries');
const fail = require('../util/fail');
const { sendVerificationEmail } = require('../auth');
const { auth, db, getFunctionUrl, getUserDocRefs } = require('../firebase');
const { logger } = require('firebase-functions/v2');
const { getFunctions } = require('firebase-admin/functions');
const { DateTime } = require('luxon');
const { FirebaseAuthError } = require('firebase-admin/auth');
const { omit } = require('lodash');
const isRandomMixedCase = require('./util/isRandomMixedCase');

/**
 * Throws upon invalid data
 * @param {CreateUserRequest} data
 * @returns {{email: string, password: string, firstName: string, lastName: string, countryCode: string, communicationLanguage: string, reference: string | null }}
 */
function validateUserData(data) {
  const { email, password, firstName, lastName, countryCode, reference, communicationLanguage } =
    data;
  if (typeof email !== 'string' || email.length < 3) {
    fail('invalid-argument');
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 100) {
    logger.error('Password did not pass validations', {
      email
    });
    fail('invalid-argument');
  }

  if (!firstName || !lastName) {
    logger.error('Missing first name or last name to create a new user', {
      firstName: firstName,
      lastName: lastName,
      email
    });
    fail('invalid-argument');
  }

  // We've observed that bots fill all three fields
  if (isRandomMixedCase(firstName) && isRandomMixedCase(lastName) && isRandomMixedCase(reference)) {
    logger.log(
      `Considered to be a fake account:\nfirstName: ${firstName}, lastName: ${lastName}, reference: ${reference}`
    );
    fail('invalid-argument');
  }

  if (typeof communicationLanguage !== 'string') {
    logger.error('Wrong communicationLanguage type');
    // TODO: is it feasible and reliable to validate the actual set of communication languages?
    fail('invalid-argument');
  }

  if (
    typeof firstName !== 'string' ||
    typeof lastName !== 'string' ||
    firstName.trim().length === 0 ||
    lastName.trim().length === 0 ||
    firstName.trim().length > 25 ||
    lastName.trim().length > 50
  ) {
    logger.error('First name or last name data does not pass validations', {
      email,
      firstName: firstName,
      lastName: lastName
    });
    fail('invalid-argument');
  }

  if (!countryCode) {
    logger.error('Missing countryCode', {
      email
    });
    fail('invalid-argument');
  }

  if (typeof countryCode !== 'string' || !Object.keys(countries).includes(countryCode)) {
    logger.error('Country code does not pass validations', {
      countryCode: countryCode,
      email
    });
    fail('invalid-argument');
  }

  return { email, password, firstName, lastName, countryCode, reference, communicationLanguage };
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

/**
 * @typedef {import('../../../src/lib/api/functions').CreateUserRequest} CRR
 */

/**
 * Callable function to create the required Firestore user documents for a newly created
 * account in Firebase Auth.
 *
 * @param {FV2.CallableRequest<CreateUserRequest>} request
 * @returns {Promise<object>}
 */
exports.createUser = async ({ data: inputData, auth: authContext }) => {
  if (authContext) {
    logger.warn('createUser should not be called with pre-existing auth state');
    fail('failed-precondition');
  }

  const data = validateUserData(inputData);

  let { password, reference, communicationLanguage, countryCode } = data;

  // Normalize name parts
  const firstName = normalizeName(data.firstName);
  const lastName = normalizeName(data.lastName);

  /**
   * @type {UserRecord}
   */
  let user;
  /**
   * @type {string | undefined}
   */
  let uid;
  /**
   * @type {string | undefined}
   */
  let email;

  const dataWithoutPassword = omit(inputData, 'password');

  try {
    // Create a Firebase user
    user = await auth.createUser({
      email: data.email,
      emailVerified: false,
      disabled: false,
      password,
      displayName: firstName
    });

    // Use the email as stored by Firebase for the next part of the function
    // Firebase will have performed lowercasing
    ({ uid, email } = user);
  } catch (e) {
    // If the account already exists, transform 'auth/email-already-exists' to 'functions/already-exists'
    if (e instanceof FirebaseAuthError) {
      // Possible errors: https://firebase.google.com/docs/auth/admin/errors
      if (e.code == 'auth/email-already-exists') {
        logger.warn("Couldn't create a new user because the email already existed", {
          data: dataWithoutPassword,
          code: e.code
        });
        fail('already-exists');
      } else if (e.code === 'auth/invalid-email') {
        logger.warn('Account creation attempted with an invalid email', {
          data: dataWithoutPassword,
          code: e.code
        });
        fail('invalid-argument', e.code);
      }
    }
    logger.error("Couldn't create a new Firebase user due to an unknown issue", {
      data: dataWithoutPassword,
      code: e.code
    });
    fail('internal');
  }

  // Set essential user data
  try {
    const { publicUserProfileDocRef: userPublicRef, privateUserProfileDocRef: userPrivateRef } =
      getUserDocRefs(user.uid);

    await Promise.all([
      // Set the Supabase user claim on the user
      auth
        .setCustomUserClaims(uid, {
          role: 'authenticated'
        })
        .catch((error) =>
          logger.error('Error setting custom claims for a new user', {
            user: user.toJSON(),
            error
          })
        ),
      // Create the public user doc
      userPublicRef.set({
        countryCode,
        firstName
        // NOTE: for new accounts, we are not setting defaults for `superfan` (false) here
        // or other properties defined in src/lib/models/Users.ts -> UserPublic
        // A data migration was run only for new existing accounts in November/December 2022.
      }),
      // Create the private user doc
      userPrivateRef.set({
        lastName,
        // Consent can be assumed here, because on the frontend, the registration form does not
        // submit without the consent checkbox being set.
        // This is essentially a mirror the creation timestamp of the users-private doc
        consentedAt: FieldValue.serverTimestamp(),
        emailPreferences: {
          newChat: true,
          news: true
        },
        creationLanguage: communicationLanguage,
        communicationLanguage,
        //
        // Optional reference field. Don't include it if it does not have a valid value
        ...(typeof reference === 'string' && reference.length > 0
          ? {
              reference
            }
          : {})
        // NOTE: there are several other properties that don't have defaults, see
        // src/lib/models/Users.ts -> UserPrivate
      })
    ]);
  } catch (ex) {
    logger.error(
      `Something went wrong while creating the Firestore user documents for ${data.email}, or sending the verification email. ` +
        'The user will be deleted',
      { error: ex, data, user }
    );
    if (uid) {
      await auth.deleteUser(uid);
    }
    fail('internal');
  }

  if (!email) {
    logger.error(
      `The email for UID ${uid} was not set when trying to send its verification email.`
    );
  }

  const [resourceName, targetUri] = await getFunctionUrl('sendMessage');
  /**
   * @type {TaskQueue<QueuedMessage>}
   */
  const sendMessageQueue = getFunctions().taskQueue(resourceName);
  await Promise.all([
    // Add one to the stats
    db
      .collection('stats')
      .doc('users')
      .set({ count: FieldValue.increment(1) }, { merge: true }),
    // Send the verification email
    sendVerificationEmail(email, firstName, communicationLanguage).catch((e) => {
      // If this occurs here, the most likely reason is that a duplicate account was created
      // (or we're over the 20QPS quota for link generation, which is unlikely. Or a SG error.)
      logger.error(
        "Couldn't send the initial verification email. Is this a duplicate account creation?",
        { error: e, email, uid }
      );
    }),
    // Enqueue the first welcome flow email
    sendMessageQueue
      .enqueue(
        {
          type: 'welcome',
          data: { uid }
        },
        {
          // 10 minutes later
          scheduleDelaySeconds: 10 * 60,
          ...(targetUri
            ? {
                uri: targetUri
              }
            : {})
        }
      )
      .catch((e) =>
        logger.error(`Error while enqueueing the first welcome email`, { uid, error: e })
      ),
    // Enqueue the last welcome flow email
    sendMessageQueue
      .enqueue(
        { type: 'become_member', data: { uid } },
        {
          scheduleTime: DateTime.now().plus({ days: 7 }).toJSDate(),
          ...(targetUri
            ? {
                uri: targetUri
              }
            : {})
        }
      )
      .catch((e) =>
        logger.error(`Error while enqueueing the "become a member" last welcome flow email`, {
          uid,
          error: e
        })
      )
  ]);

  logger.info(`New account created for ${data.email} / ${uid}`, { data: dataWithoutPassword });

  return { message: 'Your account was created successfully,', success: true };
};

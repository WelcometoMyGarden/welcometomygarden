// @ts-check
const { verifyAdminUser } = require('../auth');
const fail = require('../util/fail');
const { db, auth } = require('../firebase');
const { normalizeName, isValidFirstName, isValidLastName } = require('./util');
const stripe = require('../subscriptions/stripe');
/**
 * @typedef {import("../../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 * @typedef {Promise<boolean> | null} UpdateResult
 */

/**
 * Admin function to change the name of a user identified by the given uid or email.
 * The function first checks if the identifier looks like an email, if so, it will
 * only attempt to continue with the email identifier.
 *
 * @public
 * @param {{identifier?: string, firstName?: string, lastName?: string}} updateData
 * @param {import("firebase-functions/v1/https").CallableContext} context
 * @returns {Promise<(boolean | null)[]>} a tuple of update 4 status booleans, or null in case the update was not triggered.
 * [authDisplayNameUpdated, firestorePublicUpdated, firestorePrivateUpdated, stripeUpdated]
 */
exports.updateName = async (updateData, context) => {
  await verifyAdminUser(context);

  if (typeof updateData.identifier !== 'string') {
    fail('invalid-argument');
  }

  // Determine user by email, or UID.
  const emailRegex = /^[a-zA-Z0-9]+(?:\.[a-zA-Z0-9_]+)*@[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*$/;

  const targetAuthUser = emailRegex.test(updateData.identifier)
    ? await auth.getUserByEmail(updateData.identifier)
    : await auth.getUser(updateData.identifier);

  // First name / userPublic data prep
  const userPublicRef =
    /** @type {import('firebase-admin/firestore').DocumentReference<UserPublic>} */ (
      db.doc(`users/${targetAuthUser.uid}`)
    );
  const userPublicData = (await userPublicRef.get()).data();
  if (!userPublicData) fail('failed-precondition');
  const { firstName: currentFirstName } = userPublicData;
  /**
   * @type {string | undefined}
   */
  let normalizedNewFirstName;

  // Last name / userPrivate
  const userPrivateRef =
    /** @type {import('firebase-admin/firestore').DocumentReference<UserPrivate>} */ (
      db.doc(`users-private/${targetAuthUser.uid}`)
    );
  const userPrivateData = (await userPrivateRef.get()).data();
  if (!userPrivateData) fail('failed-precondition');
  const { lastName: currentLastName } = userPrivateData;
  /**
   * @type {string | undefined}
   */
  let normalizedNewLastName;

  // If we're trying to change the first name, verify the request & normalize the name
  if (typeof updateData.firstName === 'string') {
    const firstNameCandidate = normalizeName(updateData.firstName);
    if (isValidFirstName(firstNameCandidate) && firstNameCandidate !== currentFirstName) {
      normalizedNewFirstName = firstNameCandidate;
    }
  }

  // If we're trying to change the last name, verify the request & normalize the name
  if (typeof updateData.lastName === 'string') {
    const lastNameCandidate = normalizeName(updateData.lastName);
    if (isValidLastName(lastNameCandidate) && lastNameCandidate !== currentLastName) {
      normalizedNewLastName = lastNameCandidate;
    }
  }

  /**
   * @type {UpdateResult[]}
   */
  const updatePromises = [];

  /**
   * Wraps a Promise, returns false if it fails, true if it succeeds
   * @template T
   * @param {Promise<T>} promise
   * @returns
   */
  const falseOnReject = async (promise) => {
    try {
      await promise;
      return true;
    } catch (e) {
      return false;
    }
  };

  // Update targets where only the first name can be be updated
  if (normalizedNewFirstName) {
    // Update Firebase Auth display name
    updatePromises.push(
      falseOnReject(
        auth.updateUser(targetAuthUser.uid, {
          displayName: normalizedNewFirstName
        })
      )
    );

    // Update the Firestore public document
    updatePromises.push(falseOnReject(userPublicRef.update({ firstName: normalizedNewFirstName })));
    // Via `onUserWrite`, this will also sync the first name to:
    // - SendGrid
    // - Discourse (if applicable). Discourse only needs the first name, has no last name.
    //
    // Note: it _WON'T_ sync to Stripe, since the existence of a Stripe account requires access to user private data
    // (would be messy to put in onUserWrite)
  } else {
    updatePromises.push(null, null);
  }

  // Update targets where only the last name can be be updated
  if (normalizedNewLastName) {
    // Update the Firestore private document
    updatePromises.push(falseOnReject(userPrivateRef.update({ lastName: normalizedNewLastName })));
    // Via `onUserPrivateWrite`, this will also sync the last name to SendGrid.
  } else {
    updatePromises.push(null);
  }

  // Update targets where both names can/should be updated simultaneously
  if (normalizedNewFirstName || normalizedNewLastName) {
    // Update the full name in Stripe
    updatePromises.push(
      falseOnReject(
        new Promise((resolve) => {
          if (!userPrivateData) fail('failed-precondition');
          if (typeof userPrivateData.stripeCustomerId !== 'string') {
            console.warn(
              `UID ${targetAuthUser.uid}, who is changing their name, does not have a Stripe customer.`
            );
            resolve(false);
            return;
          }
          stripe.customers
            .update(userPrivateData.stripeCustomerId, {
              name: `${normalizedNewFirstName ?? currentFirstName} ${
                normalizedNewLastName ?? currentLastName
              }`
            })
            .then(() => {
              console.info(
                `Stripe customer name for customer ${userPrivateData.stripeCustomerId} updated`
              );
              resolve(true);
            })
            .catch((e) => {
              console.error(
                `An error happened when trying to update the name of uid ${targetAuthUser.uid} (stripe customer ${userPrivateData.stripeCustomerId}): `,
                e
              );
              resolve(false);
            });
        })
      )
    );
  } else {
    updatePromises.push(null);
  }

  return Promise.all(updatePromises);
};

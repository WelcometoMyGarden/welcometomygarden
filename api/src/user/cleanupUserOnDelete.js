const { FieldValue } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { db, getGardenWithData, storage } = require('../firebase');
const stripe = require('../subscriptions/stripe');
const { deleteContact: deleteSendGridContact } = require('../sendgrid/deleteContact');
const { supabase } = require('../supabase');
const { isSupabaseReplicationDisabled } = require('../sharedConfig');

/**
 * @param {string} userId
 */
async function deleteFromSupabaseAuth(userId) {
  if (!isSupabaseReplicationDisabled()) {
    try {
      const { error } = await supabase().from('auth').delete().eq('id', userId);
      if (error) {
        logger.error('Failed to sync a user deletion to Supabase', { uid: userId, error });
      }
    } catch (ex) {
      logger.error('Failed to sync a user deletion to Supabase', { uid: userId, error: ex });
    }
  }
}

/**
 * @param {UserRecord} user
 * @param {UserPrivate | null} userPrivate
 */
async function deleteStripeCustomer(user, userPrivate) {
  if (!userPrivate) {
    return;
  }
  // Delete the Stripe customer, if one exists
  if (userPrivate && !userPrivate.stripeCustomerId) {
    logger.warn(`No stripe customer ID recorded for the user to be deleted: ${user.uid}`);
  } else if (userPrivate && userPrivate.stripeCustomerId) {
    try {
      await stripe.customers.del(userPrivate.stripeCustomerId);
    } catch (e) {
      logger.error(
        `Something went wrong while deleting the Stripe customer ${userPrivate.stripeCustomerId} of Firebase user ${user.uid}`
      );
    }
  }
}

/**
 * @param {string} userId
 */
async function deleteGardenPhotoFiles(userId) {
  try {
    await storage.bucket().deleteFiles({ prefix: `gardens/${userId}` });
  } catch (e) {
    logger.error(`Something went wrong while deleting garden files of user ${userId}`, e);
  }
}

/**
 * @param {string} userId
 */
async function deleteTrailFiles(userId) {
  try {
    await storage.bucket().deleteFiles({ prefix: `trails/${userId}` });
  } catch (e) {
    logger.error(`Something went wrong while deleting trail files of user ${userId}`, e);
  }
}

/**
 * @param {UserRecord} user
 * @param {UserPrivate | null} userPrivate
 */
async function deleteFirebaseData(user, userPrivate) {
  // Delete main Firestore data
  const userId = user.uid;
  if (typeof userId !== 'string' || userId.length === 0) {
    logger.error('User UID unexpectedly not valid, stopping to delete Firestore data', {
      user,
      userPrivate
    });
    return;
  }

  let gardenExists = false;
  /**
   * @type {Garden | null}
   */
  let gardenData = null;

  try {
    ({ gardenData, exists: gardenExists } = await getGardenWithData(userId));
  } catch (e) {
    logger.error('Something went wrong while trying to fetch garden info for deletion', {
      userId,
      error: e
    });
  }

  try {
    await Promise.all([
      // Delete the campsite
      db
        .doc(`campsites/${userId}`)
        .delete()
        .catch((ex) => logger.error('Failure to delete a campsite', { userId, error: ex })),
      // Decrease the user count stat
      db
        .collection('stats')
        .doc('users')
        .set({ count: FieldValue.increment(-1) }, { merge: true })
        .catch((ex) =>
          logger.error('Failure to decrease the user count stats upon account deletion', {
            userId,
            error: ex
          })
        ),
      // Delete the users-private doc if it exists, including all its sub-collections (trails, unreads, push-registrations)
      // See https://googleapis.dev/nodejs/firestore/latest/Firestore.html#recursiveDelete
      userPrivate
        ? db.recursiveDelete(db.collection('users-private').doc(userId)).catch((ex) => {
            logger.error('Failure to recursively delete users-private data', { userId, error: ex });
          })
        : Promise.resolve(),
      // Delete the photo files if they exist
      gardenExists && typeof gardenData.photo === 'string'
        ? deleteGardenPhotoFiles(userId)
        : Promise.resolve(),
      // Delete trail files if they exist
      deleteTrailFiles(userId)
    ]);
  } catch (ex) {
    // Should not happen, since all errors above are caught & logged
    logger.error('Uncaught error deleting/modifying main Firestore data after account creation', {
      userId,
      error: ex
    });
  }
}

/*
 * JSDOC TS types note: this won't work:
 * @//param {Change<DocumentSnapshot>} change
 *
 * See https://github.com/microsoft/TypeScript/issues/27387
 */

/**
 * Cloud Function handler intended to run on a Firebase Auth user deletion event:
 * https://firebase.google.com/docs/reference/functions/firebase-functions.auth.userbuilder.md#authuserbuilderondelete
 * @param {UserRecord} user
 */
exports.cleanupUserOnDelete = async (user) => {
  const userId = user.uid;

  // Fetch the main user data that is needed to find other linked resources to delete
  let userPrivateSnapshot = null;
  /** @type {UserPrivate | null} */
  let userPrivate = null;
  try {
    userPrivateSnapshot = await db.doc(`users-private/${userId}`).get();
  } catch (e) {
    logger.error(`Couldn't fetch users-private data while cleaning up deleted user ${user.uid}`);
  }

  if (!userPrivateSnapshot || !userPrivateSnapshot.exists) {
    logger.error(
      `users-private data not existing for user ${user.uid} during account cleanup, this is unexpected`,
      {
        uid: user?.uid,
        email: user.email
      }
    );
  }

  userPrivate =
    /** @type {UserPrivate | null} */
    (userPrivateSnapshot?.data() ?? null);

  // Perform deletions for different systems concurrently
  await Promise.all([
    deleteFirebaseData(user, userPrivate),
    deleteStripeCustomer(user, userPrivate),
    deleteSendGridContact(user, userPrivate),
    deleteFromSupabaseAuth(userId)
  ]);
};

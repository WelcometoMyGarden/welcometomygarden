const { FieldValue } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { db } = require('../firebase');
const stripe = require('../subscriptions/stripe');
const { deleteContact } = require('../sendgrid/deleteContact');
const { supabase } = require('../supabase');
const { isSupabaseReplicationDisabled } = require('../sharedConfig');

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

  // Delete the connected SendGrid contact
  /** @type {UserPrivate | null} */
  let userPrivate = null;
  try {
    userPrivate =
      /** @type {UserPrivate} */
      ((await db.doc(`users-private/${userId}`).get()).data());
  } catch (e) {
    logger.error(`Couldn't fetch users-private data while cleaning up deleted user ${user.uid}`);
  }

  if (!userPrivate) {
    logger.error(`users-private data not existing for user ${user.uid}, this is unexpected`);
  }

  await deleteContact(user, userPrivate);

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

  const batch = db.batch();

  // We are NOT cleaning up the user's 'users' document, because its first name is still
  // visible in their partners chats
  // https://github.com/WelcometoMyGarden/welcometomygarden/blob/b7e361d5ede37c3b7a0b27a40ec2f3c018b2fd3a/src/lib/api/chat.ts#L36
  // To be tested.
  batch.delete(db.doc(`campsites/${userId}`));
  batch.delete(db.doc(`users-private/${userId}`));

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

  try {
    await batch.commit();
    await db
      .collection('stats')
      .doc('users')
      .set({ count: FieldValue.increment(-1) }, { merge: true });
  } catch (ex) {
    logger.error(ex);
  }
};

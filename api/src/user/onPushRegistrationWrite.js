const { logger } = require('firebase-functions');
const { db } = require('../firebase');
const { pushRegistrationsCol, usersPrivateDoc } = require('../collections');

/**
 * Whether a push registration belongs to a mobile app install, rather than to a browser.
 * Mirrors `isNativePushRegistration` in `src/lib/util/push-registrations.ts`: web-push
 * registrations carry a `subscription` field, native ones a `deviceId` (which may be
 * null when the device wouldn't hand one out).
 *
 * @param {import('../../../src/lib/types/PushRegistration').FirebasePushRegistration | undefined} registration
 */
const isNativeRegistration = (registration) => !!registration && 'deviceId' in registration;

/**
 * Web push is superseded by the mobile apps: as soon as a user registers a native device,
 * retire all of their web-push subscriptions.
 *
 * @param {string} userId
 */
const markWebPushRegistrationsForDeletion = async (userId) => {
  // Get all web-push subscriptions for this user (regardless of status)
  const pushRegistrationsRef = pushRegistrationsCol(userId);
  const webPushQuery = pushRegistrationsRef.where('subscription', '!=', null);
  const webPushSnapshots = await webPushQuery.get();

  // Mark each web-push subscription for deletion
  const batch = db.batch();
  webPushSnapshots.forEach((doc) => {
    batch.update(doc.ref, { status: /** @type {PushRegistrationStatus}*/ ('marked_for_deletion') });
  });
  await batch.commit();

  logger.info(
    `Marked ${webPushSnapshots.size} web-push subscriptions for deletion for user ${userId}`
  );
};

/**
 * Users may only opt out of `emailPreferences.newChat` while they can still be reached
 * through mobile push notifications. That rule is enforced in the frontend (see
 * `NewChatEmailRequiredModal.svelte`), Firestore rules can't check it, since it depends
 * on a subcollection. This is a partial backend safety net: once the last active native push
 * registration is gone, silently restore the preference, so the user keeps receiving
 * chat emails and stays reachable.
 *
 * @param {string} userId
 */
const restoreNewChatEmailsWhenUnreachable = async (userId) => {
  const activeRegistrations = await pushRegistrationsCol(userId)
    .where('status', '==', /** @type {PushRegistrationStatus} */ ('active'))
    .get();

  if (!activeRegistrations.empty) {
    // The user is still reachable on at least one mobile device
    return;
  }

  const userPrivateRef = usersPrivateDoc(userId);
  const userPrivateSnap = await userPrivateRef.get();
  if (!userPrivateSnap.exists) {
    // Normal while an account is being deleted
    return;
  }

  if (userPrivateSnap.data()?.emailPreferences?.newChat === false) {
    await userPrivateRef.update({ 'emailPreferences.newChat': true });
    logger.info(
      `Re-enabled new chat message emails for user ${userId}, who has no active mobile push registrations left`
    );
  }
};

/**
 * Triggered as part of onUserPrivateSubcollectionWriteV2 (onDocumentWritten), so we
 * must filter out subcollections other than push-registrations.
 *
 * @param {import('firebase-functions/v2/firestore').FirestoreEvent<
 *   import('firebase-functions').Change<DocumentSnapshot<import('../../../src/lib/types/PushRegistration').FirebaseNativePushRegistration | import('../../../src/lib/types/PushRegistration').FirebaseWebPushRegistration>>,
 *   { userId: string; subcollection: string; documentId: string }
 * >} event
 */
exports.onPushRegistrationWrite = async ({ data, params }) => {
  const { userId, subcollection } = params;

  if (subcollection !== 'push-registrations') {
    return;
  }

  const registrationAfter = data.after.data();

  // Only creations of a native registration retire web push.
  if (!data.before.exists && isNativeRegistration(registrationAfter)) {
    await markWebPushRegistrationsForDeletion(userId);
  }

  if (isNativeRegistration(registrationAfter) && registrationAfter?.status === 'active') {
    // Fast path for the most common write by far (a device refreshing its own active
    // registration): the user is demonstrably still reachable on mobile, so there is no
    // need to query their other registrations.
    return;
  }

  await restoreNewChatEmailsWhenUnreachable(userId);
};

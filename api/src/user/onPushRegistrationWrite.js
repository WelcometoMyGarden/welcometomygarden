const { logger } = require('firebase-functions');
const { db } = require('../firebase');

/**
 * Triggered as part of onUserPrivateSubcollectionWriteV2 (onDocumentWritten), so we
 * must filter out subcollections other than push-registrations and non-creation events.
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

  // Only handle creations, not updates or deletions
  if (data.before.exists) {
    return;
  }

  const registration = data.after.data();

  // Only handle native push registrations; web push registrations have a `subscription`
  // field instead of `deviceId`.
  // @ts-ignore
  if (!registration?.deviceId) {
    return;
  }

  // Get all web-push subscriptions for this user (regardless of status)
  const pushRegistrationsRef = /**
   * @type {CollectionReference<PushRegistration>}
   */ (db.collection(`users-private/${userId}/push-registrations`));
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

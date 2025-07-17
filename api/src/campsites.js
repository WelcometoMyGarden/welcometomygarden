const { FieldValue } = require('firebase-admin/firestore');
const { auth, db, getFunctionUrl } = require('./firebase');
const {
  sendgridHostFieldIdParam,
  sendgridListedFieldIdParam,
  sendgridGardenPhotoFieldIdParam,
  isContactSyncDisabled
} = require('./sharedConfig');
const { updateSendgridContact } = require('./sendgrid/updateSendgridContact');
const { logger } = require('firebase-functions/v2');
const { getFunctions } = require('firebase-admin/functions');

/**
 * TODO: this could be refactored to the onCampsiteWriteV2 handler, to reduce our number of functions
 * @param {FirestoreEvent< QueryDocumentSnapshot<Garden>, { campsiteId: string; }>} queryDocumentSnapshot
 */
exports.onCampsiteCreate = async ({ data }) => {
  const uid = data.id;
  const gardenData = data.data();

  /**
   * @type {UserRecord | null}
   */
  let user = null;
  try {
    user = await auth.getUser(uid);
  } catch (e) {
    // At the time of writing, there exist about 10 gardens with ids that don't match a user's ID
    // Probably gardens of deleted users! This error not happen on create, but better to handle it.
    logger.error("Couldn't fetch the user connected to a garden");
  }
  if (user && !isContactSyncDisabled()) {
    // Sync the host status to SendGrid
    const sendgridContactUpdateDetails = {
      email: user.email,
      custom_fields: {
        [sendgridHostFieldIdParam.value()]: 1,
        // Every garden starts off as listed
        [sendgridListedFieldIdParam.value()]: 1,
        [sendgridGardenPhotoFieldIdParam.value()]: gardenData.photo ? 1 : 0
      }
    };

    await updateSendgridContact(sendgridContactUpdateDetails, 'new garden');
  }

  // Update statistics
  await db
    .collection('stats')
    .doc('campsites')
    .set({ count: FieldValue.increment(1) }, { merge: true });

  // Schedule the photo reminder email
  const [resourceName, targetUri] = await getFunctionUrl('sendMessage');
  /**
   * @type {TaskQueue<QueuedMessage>}
   */
  const sendMessageQueue = getFunctions().taskQueue(resourceName);
  await sendMessageQueue.enqueue(
    {
      type: 'photo_reminder',
      data: {
        uid: user.uid
      }
    },
    {
      // 7 days
      scheduleDelaySeconds: 7 * 24 * 3600,
      ...(targetUri
        ? {
            uri: targetUri
          }
        : {})
    }
  );
};

/**
 * @param {FirestoreEvent<QueryDocumentSnapshot<Garden>, { campsiteId: string; }>} queryDocumentSnapshot
 */
exports.onCampsiteDelete = async ({ data }) => {
  // Mark the connected user as non-host in SendGrid

  const uid = data.id;
  /** @type {UserRecord | null} */
  let user = null;
  try {
    // This case happens when we manually delete a garden document in Firebase. This is sometimes requested, as we don't
    // support a user-facing way of doing this yet.
    user = await auth.getUser(uid);
  } catch (e) {
    // The user is being deleted through Firebase auth, and this deletion is a result of the cleanup calls after that action.
    // in this case, the cleanup call will also fully delete the SendGrid contact! It is important to not recreate it (user = null)
    logger.info(
      `Couldn't fetch the user connected to a garden while deleting it. This is probably expected.`,
      { uid }
    );
  }
  if (user && !isContactSyncDisabled()) {
    // Sync the host status to SendGrid
    const sendgridContactUpdateDetails = {
      email: user.email,
      custom_fields: {
        [sendgridHostFieldIdParam.value()]: 0
        // NOTE: the listed and photo fields are not touched here.
        // We should be careful with making assumptions about those.
      }
    };

    await updateSendgridContact(sendgridContactUpdateDetails, 'deleted garden');
  }

  await db
    .collection('stats')
    .doc('campsites')
    .set({ count: FieldValue.increment(-1) }, { merge: true });
};

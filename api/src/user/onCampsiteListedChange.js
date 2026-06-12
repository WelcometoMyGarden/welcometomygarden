const { Timestamp } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions/v2');
const { changeData, getUserDocRefs } = require('../firebase');
/**
 * @param {FirestoreEvent<Change<DocumentSnapshot<Garden>>>} change
 */
module.exports = async ({ data }) => {
  // Prepare input for change detection
  const { after, beforeData, afterData, isCreation, isDeletion } = changeData(data);

  const listedChanged = beforeData?.listed !== afterData?.listed;

  if (isCreation || isDeletion || !listedChanged) {
    return;
  }

  let latestListedChangeAt;
  // Did the removal date also change, while listed was set to "false"?
  // Then use that value for the last change date.
  // We guarantee these properties to be equal in this case.
  if (
    beforeData?.latestRemovedAt !== afterData?.latestRemovedAt &&
    afterData?.latestRemovedAt instanceof Timestamp &&
    afterData.listed === false
  ) {
    latestListedChangeAt = afterData.latestRemovedAt;
  } else {
    latestListedChangeAt = Timestamp.now();
  }

  // Update the document
  // This should result in new listener calls that will just replicate (SendGrid and Supabase).
  await after.ref.update({ latestListedChangeAt });

  // When the garden was just relisted (listed set to true), clear any pending scheduled relist date
  // on the owner's users-private doc.
  // For the front-end triggered upates this should already be done by a batched write by the frontend,
  // to ensure quick UI state updates.
  if (afterData?.listed === true) {
    const uid = after.ref.id;
    const { privateUserProfileDocRef } = getUserDocRefs(uid);
    const userPrivateSnapshot = await privateUserProfileDocRef.get();
    const relistGardenAt = userPrivateSnapshot.data()?.relistGardenAt;
    if (relistGardenAt instanceof Timestamp) {
      logger.info(`Clearing relistGardenAt for relisted garden of user ${uid}.`);
      await privateUserProfileDocRef.update({ relistGardenAt: null });
    }
  }
};

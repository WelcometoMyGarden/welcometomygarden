const { Timestamp } = require('firebase-admin/firestore');
const { changeData } = require('../firebase');
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
};

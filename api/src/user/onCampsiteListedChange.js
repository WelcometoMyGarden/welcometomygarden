const { Timestamp } = require('firebase-admin/firestore');
/**
 * @param {FirestoreEvent<Change<DocumentSnapshot<Garden>>>} change
 */
module.exports = async ({ data: change }) => {
  // Prepare input for change detection
  const { before, after } = change;
  let beforeData = null;
  let afterData = null;
  if (before.exists) {
    beforeData = before.data();
  }
  if (after.exists) {
    afterData = after.data();
  }
  const isCreation = !before.exists;
  const isDeletion = !after.exists;
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
  // This should result in a new listener call that will just replicate.
  await after.ref.update({ latestListedChangeAt });
};

// eslint-disable-next-line import/no-unresolved
const { Timestamp } = require('firebase-admin/firestore');
const { replicate } = require('./shared');

/**
 * @param {import("firebase-functions").Change<import('@google-cloud/firestore').DocumentSnapshot<import('../campsites').Garden>>} change
 */
module.exports = async (change) => {
  // First replicate the change
  await replicate({
    change,
    tableName: 'campsites',
    // Omit legacy props
    pick: [
      'description',
      'location',
      'facilities',
      'listed',
      'createTime',
      'updateTime',
      'photo',
      'latestListedChangeAt',
      'latestRemovedAt',
      'latestWarningForInactivityAt'
    ]
  });
  //
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

  // Next, update the listed timestamp in the Firebase doc, but only if it was a document update,
  // and only if the listed property changed.
  //
  // TODO: it is a bit "unclean" to have this depend on shouldReplicate, which controls the onCampsitesWrite execution overall
  // Ideally this would apply also when replication is off.
  // The reason I did it this way, is that this guarantees that the 2nd latestListedChangeAt Firestore update will be
  // _called_ come _after_ the first replication call
  // If we execute them in parallel (using `multiplexFirestoreTrigger`), there is _more risk_ that a race condition occurs where the
  // firestore.
  // - idea: we might improve this by having another `serializeFirestoreTrigger` utility that will guarantee the same as exists here.
  // - even with this "serial" nature, there would still be risks due to the unguaranteed order of firestore triggers...
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

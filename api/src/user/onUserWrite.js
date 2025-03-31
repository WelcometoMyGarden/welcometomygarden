const { FieldValue } = require('firebase-admin/firestore');
const { auth, db } = require('../firebase');
const fail = require('../util/fail');
const { sendgridSuperfanFieldIdParam, isContactSyncDisabled } = require('../sharedConfig');
const { updateSendgridContact } = require('../sendgrid/updateSendgridContact');

/**
 * @param {FirestoreEvent<Change<DocumentSnapshot<UserPublic>>>} change
 * @returns {Promise<any>}
 */
exports.onUserWrite = async ({ data: change }) => {
  const { before, after } = change;

  if (!after.exists) {
    // As of now, public user documents *should not be deleted*
    // Not even when an account is deleted. Consequently,
    // This should not happen.
    fail('invalid-argument');
  }

  // We now have a:
  // Creation event (!before.exists)
  // OR Update event (before.exists)
  const userAfter = after.data();

  if (!userAfter) {
    fail('internal');
  }

  /**
   * @type {UserPublic | null}
   */
  let userBefore = null;
  if (before.exists) {
    userBefore = before.data();
  }

  //
  // Count superfans
  //
  const superfanStatsDoc = await db.collection('stats').doc('superfans');
  if (
    ((userBefore && userBefore.superfan === true) || !userBefore) &&
    userAfter.superfan === false
  ) {
    // The superfan status was removed (explicity set to false)
    // Note: new accounts get an undefined .superfan by default, so
    // this should not count on every creation
    superfanStatsDoc.set({ count: FieldValue.increment(-1) }, { merge: true });
  } else if (((userBefore && !userBefore.superfan) || !userBefore) && userAfter.superfan === true) {
    // The superfan status was set
    superfanStatsDoc.set({ count: FieldValue.increment(1) }, { merge: true });
  }

  if (!isContactSyncDisabled()) {
    //
    // Update SendGrid contact info
    //
    const { firstName, superfan, countryCode } = userAfter;

    const authUser = await auth.getUser(after.id);
    const sendgridContact = {
      email: authUser.email,
      first_name: firstName,
      country: countryCode,
      custom_fields: {
        // Because only numbers & text are supported as data types, not
        // (not sure how they appear in "JSON" data exports though)
        [sendgridSuperfanFieldIdParam.value()]: superfan ? 1 : 0
      }
    };
    await updateSendgridContact(sendgridContact, 'updated user-public');
  }
};

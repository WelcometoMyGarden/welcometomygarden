const { logger } = require('firebase-functions/v2');
const { createSendgridContact } = require('./createSendgridContact');
const { deleteContact } = require('./deleteContact');

/**
 * Updates the email of a SendGrid contact. This also changes their SendGrid contact id,
 * and upserts that new contact ID into the user's users-private data.
 *
 * It is impossible to update a SendGrid contact's email address directly (see for example https://stackoverflow.com/questions/54845096/how-do-you-change-a-recipients-email-address-with-the-sendgrid-v3-api)
 * This method achieves the update by 1) deleting the original contact, 2) creating a new contact with identical properties (save creation/update timestamps), and 3) linking the new contact ID in the original contact's Firestore private data
 *
 * @param {UserRecord} firebaseUser
 * @param {UserPrivate} oldUserPrivateData
 * @returns {Promise<void>}
 */
exports.updateSendgridContactEmail = async (firebaseUser, oldUserPrivateData) => {
  logger.info(
    `Updating the SendGrid email of uid ${firebaseUser.uid} (contact id ${oldUserPrivateData.sendgridId}) to ${firebaseUser.email}`
  );

  // Delete the old contact (if it exists)
  const [deletedOldSendGridContact, createdNewSendGridContact] = (
    await Promise.allSettled([
      deleteContact(firebaseUser, oldUserPrivateData),
      createSendgridContact(firebaseUser.uid)
    ])
  ).map((p) => p.status === 'fulfilled');
  if (!deletedOldSendGridContact || !createdNewSendGridContact) {
    logger.error(
      `Email change did not go well:` +
        `${!deletedOldSendGridContact ? 'old contact deletion failed' : ''}` +
        `${!createdNewSendGridContact ? 'new contact creation failed' : ''}`,
      {
        uid: firebaseUser.uid,
        new_email: firebaseUser.email,
        old_contact_id: oldUserPrivateData.sendgridId
      }
    );
  }
};

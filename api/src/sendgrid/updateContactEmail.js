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
  console.info(
    `Updating the SendGrid email of uid ${firebaseUser.uid} (contact id ${oldUserPrivateData.sendgridId}) to ${firebaseUser.email}`
  );

  // Create the new contact
  await createSendgridContact(firebaseUser.uid);

  // Delete the old contact (if it exists)
  //
  // Why do this after creating the new contact?
  // For some reason a contact deletion causes the creation jobs to take much longer
  // then exceed the Firebase function max timeout of 60s
  // TODO: this would be a good candidate to give much more time (2-5 min?) in Functions v2
  await deleteContact(firebaseUser, oldUserPrivateData);
};

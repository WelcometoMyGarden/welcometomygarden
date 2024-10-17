const { createSendgridContact } = require('./createSendgridContact');
const { db } = require('../firebase');
const { deleteContact } = require('./deleteContact');
const {
  sendgridSuperfanFieldIdParam,
  sendgridCommunicationLanguageFieldIdParam,
  sendgridHostFieldIdParam
} = require('../sharedConfig');

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

  // Fetch missing info from Firebase to construct the new contact
  const userPublicData = /** @type {UserPublic | undefined} */ (
    (await db.doc(`users/${firebaseUser.uid}`).get()).data()
  );
  const campsiteRef = await db.doc(`campsites/${firebaseUser.uid}`).get();
  const isHost = campsiteRef.exists;

  // Combine all fields that are not set in the SG contact creation function
  const contactUpdateFields = {
    firstName: userPublicData.firstName,
    country: userPublicData.countryCode,
    lastName: oldUserPrivateData.lastName,
    custom_fields: {
      [sendgridCommunicationLanguageFieldIdParam.value()]: oldUserPrivateData.communicationLanguage,
      [sendgridSuperfanFieldIdParam.value()]: userPublicData.superfan ? 1 : 0,
      [sendgridHostFieldIdParam.value()]: isHost ? 1 : 0
      // We intentionally DO NOT include SG_CREATION_LANGUAGE_FIELD_ID
      // this prevents the user from re-entering (with the new contact)
      // automation lists, which all depend on this field
    }
  };

  // Create the new contact
  await createSendgridContact(
    firebaseUser,
    contactUpdateFields,
    oldUserPrivateData.emailPreferences.news
  );

  //
  //
  // Delete the old contact (if it exists)
  //
  // Why do this after creating the new contact?
  // For some reason a contact deletion causes the creation jobs to take much longer
  // then exceed the Firebase function max timeout of 60s
  // TODO: this would be a good candidate to give much more time (2-5 min?) in Functions v2
  await deleteContact(firebaseUser, oldUserPrivateData);
};

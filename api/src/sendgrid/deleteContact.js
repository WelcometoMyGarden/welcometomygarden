const { logger } = require('firebase-functions');
const getContactByEmail = require('./getContactByEmail');
const { sendgrid: sendgridClient } = require('./sendgrid');

/**
 * @typedef {import("../../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

/**
 * @package {string} email
 * @throws when there is no contact with this email; or when the deletion fails
 */
exports.deleteContactByEmail = async (email) => {
  // Get the contact, if it exists
  const { id } = await getContactByEmail(email);
  // Delete it
  await sendgridClient.request({
    url: '/v3/marketing/contacts',
    method: 'DELETE',
    qs: {
      ids: [id]
    }
  });
};

/**
 * Tries to delete a contact with the info from UserPrivate. Catches and ignores errors.
 * @param {UserRecord} user
 * @param {UserPrivate | undefined} userPrivate
 */
exports.deleteContact = async (user, userPrivate) => {
  if (userPrivate && !userPrivate.sendgridId) {
    // Missing sendgridId's can occur, because linking back the sendgridId after contact creation is not guaranteed
    // due to the timeout and max function runtime, see `createSendgridContact.js`.
    logger.warn(
      `No sendgridId recorded for user to be deleted (${user.uid}); trying deletion by email ${user.email}, `
    );
    try {
      await this.deleteContactByEmail(user.email);
    } catch (e) {
      logger.error('Failed to delete the contact by email', e);
    }
  } else if (userPrivate && userPrivate.sendgridId) {
    logger.log(`Deleting contact ${userPrivate.sendgridId} (fb user ${user.uid})`);
    try {
      await sendgridClient.request({
        url: `/v3/marketing/contacts`,
        method: 'DELETE',
        qs: {
          ids: userPrivate.sendgridId
        }
      });
    } catch (e) {
      logger.error(
        `Something went wrong while deleting the contact ${userPrivate.sendgridId} of Firebase user ${user.uid}`,
        e
      );
    }
  }
};

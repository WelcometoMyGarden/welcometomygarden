const { logger } = require('firebase-functions');
const getContactByEmail = require('./getContactByEmail');
const { sendgrid: sendgridClient } = require('./sendgrid');

/**
 * @package {string} email
 * @throws when there is no contact with this email; or when the deletion fails
 */
exports.deleteContactByEmail = async (email) => {
  // Get the contact, if it exists
  const { id } = await getContactByEmail(email);
  logger.debug(`Found the SendGrid contact to be deleted by email`, { email, contact_id: id });
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
 * The uid passed in the first parameter is purely for reporting purposes, it will not be used
 * to fetch Firebase Auth info.
 * @param {{uid?: string, email?: string} | undefined} user
 * @param {{sendgridId?: string}} [userPrivate]
 */
exports.deleteContact = async (user, userPrivate) => {
  if (user?.email == null && userPrivate?.sendgridId == null) {
    logger.error('Tried to delete a contact without lookup details');
  }
  if (!userPrivate?.sendgridId && user?.email) {
    // Missing sendgridId's can occur, because linking back the sendgridId after contact creation is not guaranteed
    // due to the timeout and max function runtime, see `createSendgridContact.js`.
    logger.warn(
      `No sendgridId recorded for user to be deleted (${user?.uid ?? 'unknown uid'}); trying deletion by email ${user?.email ?? 'unknown email'}, `
    );
    try {
      await this.deleteContactByEmail(user.email);
    } catch (e) {
      logger.error('Failed to delete the contact by email', e);
    }
  } else if (userPrivate?.sendgridId) {
    logger.log(`Deleting contact ${userPrivate.sendgridId} (fb user ${user?.uid ?? 'unknown'})`);
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
        `Something went wrong while deleting the contact ${userPrivate.sendgridId} of Firebase user ${user?.uid ?? 'unknown'}`,
        e
      );
    }
  }
};

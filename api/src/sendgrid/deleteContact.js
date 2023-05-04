// @ts-check
const { sendgrid: sendgridClient } = require('./sendgrid');

/**
 * @typedef {import("../../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

/**
 * Handles deletion with the info from UserPrivate. Ignores cases where
 * there is no SendGrid contact ID.
 * @param {UserRecord} user
 * @param {UserPrivate | undefined} userPrivate
 */
exports.deleteContact = async (user, userPrivate) => {
  if (userPrivate && !userPrivate.sendgridId) {
    console.warn(`No sendgridId recorded for user to be deleted: ${user.uid}`);
  } else if (userPrivate && userPrivate.sendgridId) {
    console.log(`Deleting contact ${userPrivate.sendgridId}`);
    try {
      await sendgridClient.request({
        url: `/v3/marketing/contacts`,
        method: 'DELETE',
        qs: {
          ids: userPrivate.sendgridId
        }
      });
    } catch (e) {
      console.error(
        `Something went wrong while deleting the contact ${userPrivate.sendgridId} of Firebase user ${user.uid}`,
        e
      );
    }
  }
};

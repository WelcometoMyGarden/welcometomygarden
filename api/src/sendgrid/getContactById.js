const { logger } = require('firebase-functions');
const { sendgrid } = require('./sendgrid');

/**
 * @param {string} id
 * @throws when the contact doesn't exist
 * @returns a SendGrid contact entry
 */
module.exports = async (id) => {
  const [{ statusCode }, contact] = await sendgrid.request({
    url: /** @type {const} */ (`/v3/marketing/contacts/${id}`),
    method: 'GET'
  });

  if (statusCode !== 200) {
    logger.error(`Something went wrong while getting the SendGrid contact ID for contact id ${id}`);
    throw new Error('SendGrid Contact not found');
  }

  return /** @type {SendGrid.ContactDetails} */ (contact);
};

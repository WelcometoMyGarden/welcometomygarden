const { logger } = require('firebase-functions');
const { sendgrid } = require('./sendgrid');

/**
 * @param {string} email
 * @throws when the contact doesn't exist
 * @returns a SendGrid contact entry
 */
module.exports = async (email) => {
  const [{ statusCode: getIdStatusCode }, { result, errors }] = await sendgrid.request({
    url: /** @type {const} */ ('/v3/marketing/contacts/search/emails'),
    method: 'POST',
    body: {
      emails: [email]
    }
  });

  if (getIdStatusCode !== 200 || errors) {
    logger.error(
      `Something went wrong while getting the SendGrid contact ID for email ${email}`,
      errors
    );
    throw new Error(errors);
  }

  // Note: I'm not sure if SG does any internal lowercasing, and if our Firebase dataset may have
  // differently cased versions.
  if (!result || !(email in result)) {
    logger.error(`Contact with email ${email} not found in SendGrid`);
    throw new Error('Contact not found');
  }

  return /** @type {SendGrid.ContactDetails} */ (result[email].contact);
};

const { logger } = require('firebase-functions/v2');
const { sendgrid: sendgridClient } = require('./sendgrid');
/**
 * Never throws. Does not yet support addition to a list.
 * @param {SendGrid.ContactUpsertDetails} details
 * @param {string} [logString]
 */
const updateSendgridContact = async (details, logString) => {
  try {
    const [{ statusCode }, body] = await sendgridClient.request({
      url: '/v3/marketing/contacts',
      method: 'PUT',
      body: {
        contacts: [details]
      }
    });
    if (statusCode !== 202) {
      logger.error(
        `Unexpected non-erroring SendGrid response when updating a contact with ${logString ?? ' '}data`,
        {
          details,
          statusCode,
          body
        }
      );
    }
    logger.debug(`SendGrid upsert sent for ${logString}`, {
      details,
      responseBody: body
    });
  } catch (e) {
    logger.error(`Unexpected SendGrid error when updating a contact with ${logString}`, {
      details,
      error: e
    });
  }
};

module.exports = { updateSendgridContact };

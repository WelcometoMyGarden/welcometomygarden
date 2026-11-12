const { logger } = require('firebase-functions/v2');
const { sendAbandonedCartReminder } = require('./sendAbandonedCartReminder');
const { sendMessageReminder } = require('./sendMessageReminder');
const { sendPhotoReminderEmail } = require('./sendPhotoReminderEmail');
const { sendWelcomeFlowEmail } = require('./sendWelcomeFlowEmail');
const { sendNewHostEmail } = require('../mail');
const { getUser } = require('./util');
const { getUserDocRefsWithData } = require('../firebase');

/**
 * @param {import('firebase-functions/v2/tasks').Request<QueuedMessage>} req
 * @returns {Promise<void>}
 */
exports.sendQueuedMessage = async (req) => {
  const { type, data } = req.data;
  if (type === 'message_reminder') {
    return sendMessageReminder({ ...req, data });
  } else if (type.startsWith('welcome') || type === 'become_member') {
    return sendWelcomeFlowEmail(req);
  } else if (type === 'photo_reminder') {
    return sendPhotoReminderEmail({ ...req, data });
  } else if (type === 'abandoned_cart') {
    return sendAbandonedCartReminder({ ...req, data });
  } else if (type === 'new_host') {
    const { uid } = data;
    const user = await getUser(uid, 'new host');
    if (!user) {
      return;
    }
    // Always sent (also with news=no), also when the garden is unlisted
    const {
      privateUserProfileData: { communicationLanguage, secret }
    } = await getUserDocRefsWithData(uid);
    const emailData = {
      email: /** @type {string} */ (user.email),
      firstName: /** @type {string} */ (user.displayName),
      language: communicationLanguage,
      secret
    };
    await sendNewHostEmail(emailData);
    return;
  } else {
    logger.error(`Unhandled queued message type: ${type}`);
  }
};

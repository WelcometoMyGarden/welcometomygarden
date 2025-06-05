const { logger } = require('firebase-functions/v2');
const { getUserDocRefs } = require('../firebase');
const { sendWelcomeEmail } = require('../mail');
const { sendAbandonedCartReminder } = require('./sendAbandonedCartReminder');
const { sendBecomeMemberEmail } = require('./sendBecomeMemberEmail');
const { sendMessageReminder } = require('./sendMessageReminder');
const { getUser } = require('./util');
const { sendPhotoReminderEmail } = require('./sendPhotoReminderEmail');

/**
 * @param {import('firebase-functions/v2/tasks').Request<QueuedMessage>} req
 * @returns {Promise<void>}
 */
exports.sendQueuedMessage = async (req) => {
  const { type, data } = req.data;
  // No type or inner data is present, which means this is an old scheduled message_reminder event
  // before we had types on this handler or enqueues
  // @TODO: this should become irrelevant in 24 hours after the morning of March 4th
  if (!type && !data) {
    // @ts-ignore
    return this.sendMessageReminder(req);
  }
  if (type === 'message_reminder') {
    return sendMessageReminder({ ...req, data });
  } else if (type === 'welcome') {
    const user = await getUser(data.uid, 'welcome email');
    if (user) {
      const { privateUserProfileDocRef } = await getUserDocRefs(data.uid);
      const { communicationLanguage } = (await privateUserProfileDocRef.get()).data();
      logger.info('Sending welcome email', { uid: user.uid });
      await sendWelcomeEmail(user.email, user.displayName, communicationLanguage);
    }
  } else if (type === 'become_member') {
    return sendBecomeMemberEmail({ ...req, data });
  } else if (type === 'photo_reminder') {
    return sendPhotoReminderEmail({ ...req, data });
  } else if (type === 'abandoned_cart') {
    return sendAbandonedCartReminder({ ...req, data });
  } else {
    logger.error(`Unhandled queued message type: ${type}`);
  }
};

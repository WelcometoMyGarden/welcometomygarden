const { getMessaging } = require('firebase-admin/messaging');
const { logger } = require('firebase-functions/v2');
/**
 * @typedef {Object} PushConfig
 * @property {string} fcmToken
 * @property {string} senderName
 * @property {string} message
 * @property {string} messageUrl
 * @property {boolean} superfan
 * @property {string} language
 */

/**
 * @param {PushConfig} config
 * @throws when the sending fails
 * @returns
 */
exports.sendNotification = async (config) => {
  const { fcmToken, senderName, message, messageUrl, language } = config;

  const messageFrom = { en: 'Message from', nl: 'Bericht van', fr: 'Message de' }[language ?? 'en'];

  /**
   * @type {import('firebase-admin/messaging').Message}
   */
  const fcmPayload = {
    notification: {
      title: `${messageFrom} ${senderName}`,
      body: message
    },
    // https://firebase.google.com/docs/cloud-messaging/js/receive#setting_notification_options_in_the_send_request
    data: {
      link: messageUrl
    },
    webpush: {
      fcmOptions: { link: messageUrl }
    },
    token: fcmToken
  };

  // Send a message to the device corresponding to the provided
  // registration token.
  return getMessaging()
    .send(fcmPayload)
    .then((response) => {
      logger.log('Successfully sent new message push notification', {
        // Response is a message ID string.
        messageId: response,
        fcmToken
      });
    });
};

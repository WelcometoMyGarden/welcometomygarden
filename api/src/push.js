const { getMessaging } = require('firebase-admin/messaging');
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
      // Response is a message ID string.
      console.log('Successfully sent message notification:', response);
    })
    .catch((error) => {
      console.log('Error sending message notification:', error);
    });
};

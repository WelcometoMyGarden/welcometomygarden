const { logger } = require('firebase-functions/v2');
const { auth } = require('../firebase');

/**
 * @param {string} uid
 * @param {string} emailType
 * @returns {Promise<UserRecord | null>}
 */
exports.getUser = async function (uid, emailType) {
  // First check if the sender is not deleted or disabled
  /**
   * @type {UserRecord}
   */
  let user;
  try {
    user = await auth.getUser(uid);
  } catch (e) {
    logger.info(`User ${uid} is likely deleted, skipping ${emailType} email.`);
    return null;
  }
  if (user.disabled) {
    logger.info(`User ${uid} is disabled, skipping the ${emailType} email.`);
    return null;
  }
  return user;
};

const { logger } = require('firebase-functions/v2');
const { getUserDocRefsWithData, getGardenWithData } = require('../firebase');
const { sendPhotoReminderEmail } = require('../mail');
const { getUser } = require('./util');

/**
 * @param {import('firebase-functions/v2/tasks').Request<EmailTargetData>} req
 * @returns {Promise<void>}
 */
exports.sendPhotoReminderEmail = async function (req) {
  const { uid } = req.data;
  const user = await getUser(uid, 'photo reminder');

  if (user) {
    // Get user data and check garden
    const [
      {
        privateUserProfileData: { communicationLanguage }
      },
      { exists: gardenExists, gardenData }
    ] = await Promise.all([getUserDocRefsWithData(uid), getGardenWithData(uid)]);

    // Only send reminder if they have a listed garden without a photo
    if (gardenExists && !gardenData.photo && gardenData.listed) {
      logger.info('Sending photo reminder email', { uid });
      await sendPhotoReminderEmail(user.email, user.displayName, communicationLanguage || 'en');
    } else {
      logger.info('Host does not need a photo reminder', {
        uid,
        hasListedGarden: gardenExists && gardenData.listed
      });
    }
  }
};

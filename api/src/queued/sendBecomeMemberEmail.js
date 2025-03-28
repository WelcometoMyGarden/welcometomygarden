const { logger } = require('firebase-functions/v2');
const { getUserDocRefsWithData, getGardenWithData } = require('../firebase');
const { sendBecomeMemberEmail } = require('../mail');
const { getUser } = require('./util');

/**
 * @param {import('firebase-functions/v2/tasks').Request<EmailTargetData>} req
 * @returns {Promise<void>}
 */
exports.sendBecomeMemberEmail = async function (req) {
  const { uid } = req.data;
  const user = await getUser(uid, 'become member');
  if (user) {
    const [
      {
        privateUserProfileData: {
          emailPreferences: { news },
          communicationLanguage
        },
        publicUserProfileData: { superfan: isMember }
      },
      { exists: gardenExists }
    ] = await Promise.all([getUserDocRefsWithData(uid), getGardenWithData(uid)]);
    const metadata = { uid, news, addedGarden: gardenExists, isMember: !!isMember };
    if (news === true && gardenExists === false && !isMember) {
      logger.info('Sending "become a member" email, 4th of the welcome flow', metadata);
      await sendBecomeMemberEmail(user.email, user.displayName, communicationLanguage);
    } else {
      logger.info(`User does not meet the criteria to send the 4th welcome flow email`, metadata);
    }
  }
};

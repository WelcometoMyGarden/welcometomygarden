const { logger } = require('firebase-functions');
const { getUserDocRefsWithData, getFunctionUrl, getGardenWithData } = require('../firebase');
const { getUser } = require('./util');
const {
  sendWelcomeFlow1stEmail,
  sendWelcomeFlow2ndEmail,
  sendWelcomeFlow3rdEmail,
  sendWelcomeFlow4thEmail
} = require('../mail');
const { getFunctions } = require('firebase-admin/functions');
const { DateTime } = require('luxon');

/**
 *
 * @param {EmailTargetType} type
 * @param {string} uid
 * @param {Date} scheduleTime
 */
async function enqueueWelcomeFlowEmail(type, uid, scheduleTime) {
  const [resourceName, targetUri] = await getFunctionUrl('sendMessage');
  /**
   * @type {TaskQueue<QueuedMessage>}
   */
  const sendMessageQueue = getFunctions().taskQueue(resourceName);
  return sendMessageQueue
    .enqueue(
      {
        type,
        data: { uid }
      },
      {
        scheduleTime,
        ...(targetUri
          ? {
              uri: targetUri
            }
          : {})
      }
    )
    .catch((e) => logger.error(`Error while enqueueing ${type}`, { uid, error: e }));
}

/**
 * @param {import('firebase-functions/v2/tasks').Request<QueuedMessage>} req
 * @returns {Promise<void>}
 */
exports.sendWelcomeFlowEmail = async function (req) {
  const { type, data: innerData } = req.data;
  /** Welcome flow email sequence number */
  const seq = type === 'become_member' ? 4 : Number.parseInt(type.replace('welcome', '') || '1');
  const { uid } = /** @type {EmailTargetData} */ (innerData);
  const user = await getUser(uid, `welcome ${seq} email`);
  if (!user) {
    return;
  }
  const {
    privateUserProfileData: {
      communicationLanguage,
      secret,
      emailPreferences: { news }
    },
    publicUserProfileData: { superfan: isMember }
  } = await getUserDocRefsWithData(uid);

  // Check if we can send the desired email, exit early if not
  if (seq > 1 && !news) {
    // `news` permission is needed for emails 2+
    return;
  } else if (seq === 4) {
    // Extra criteria for email 4 'become member'
    if (isMember) {
      return;
    }
    const { exists: gardenExists } = await getGardenWithData(uid);
    if (gardenExists) {
      return;
    }
  }

  // Also enqueue the next email, but only if we're sending the current one
  // this avoid someone getting email 1, unsubscribing from news, missing email 2, 3
  // then resubscribing to news, and getting email 4 still
  logger.info(`Sending welcome email ${seq}`, { uid: user.uid });
  const dtNow = DateTime.now();
  const emailData = {
    email: /** @type {string} */ (user.email),
    firstName: /** @type {string} */ (user.displayName),
    language: communicationLanguage,
    secret
  };
  if (seq === 1) {
    await sendWelcomeFlow1stEmail(emailData);
    await enqueueWelcomeFlowEmail('welcome2', uid, dtNow.plus({ days: 2 }).toJSDate());
  } else if (seq === 2) {
    await sendWelcomeFlow2ndEmail(emailData);
    await enqueueWelcomeFlowEmail('welcome3', uid, dtNow.plus({ days: 3 }).toJSDate());
  } else if (seq === 3) {
    await sendWelcomeFlow3rdEmail(emailData);
    await enqueueWelcomeFlowEmail('welcome4', uid, dtNow.plus({ days: 2 }).toJSDate());
  } else if (seq === 4) {
    await sendWelcomeFlow4thEmail(emailData);
  }
  return;
};

const { logger } = require('firebase-functions/v2');
const { getUserDocRefsWithData } = require('../firebase');
const { DateTime } = require('luxon');
const { isWTMGSubscription } = require('../subscriptions/stripeEventHandlers/util');
const stripe = require('../subscriptions/stripe');
const { sendPlausibleEvent } = require('../util/plausible');
const { sendAbandonedCartReminderEmail } = require('../mail');
const { getUser } = require('./util');
/**
 * TODO: considering the fixed 7am,11am,6pm schedule, this would probably be better
 * implemented as a cron function; rather than a queue task.
 * @param {import('firebase-functions/v2/tasks').Request<SendAbandonedCartReminderData>} req
 * @returns {Promise<void>}
 */
exports.sendAbandonedCartReminder = async (req) => {
  const { uid, customerId } = req.data;
  // First check if the sender is not deleted or disabled
  let user = await getUser(uid, 'abandoned cart reminder');
  if (!user) {
    return;
  }

  // Check if the user subscribed by now
  const { publicUserProfileData, privateUserProfileData } = await getUserDocRefsWithData(uid);
  if (publicUserProfileData.superfan) {
    logger.info(`User ${uid} became a member before this abandoned cart check, skipping email`);
    return;
  }

  // Check the customer's Stripe subscriptions
  // We don't want to send the email more than once per two weeks, and this check should be scheduled
  // at every new subscription creation
  const { data: allStripeSubscriptions } = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all'
  });
  const twoWeeksAgo = DateTime.now().minus({ weeks: 2 }).toSeconds();
  const numberOfWTMGSubsInTheLastTwoWeeks = allStripeSubscriptions.filter(
    (s) => isWTMGSubscription(s) && s.start_date >= twoWeeksAgo
  ).length;
  if (numberOfWTMGSubsInTheLastTwoWeeks > 1) {
    logger.info(
      `User ${uid} had more than 1 subscription created in the last 2 weeks, skipping abandoned cart email`
    );
    return;
  }

  const hour = DateTime.now().setZone('Europe/Brussels').hour.toString();
  await sendPlausibleEvent('Send Abandoned Cart Email', {
    functionName: 'sendAbandonedCartReminder',
    props: {
      hour
    }
  });
  logger.info(
    `Sending abandoned cart reminder email to ${uid} / ${customerId} at ${DateTime.now().setZone('Europe/Brussels').toISO()}`
  );
  await sendAbandonedCartReminderEmail(
    user.email,
    publicUserProfileData.firstName,
    privateUserProfileData.communicationLanguage
  );
};

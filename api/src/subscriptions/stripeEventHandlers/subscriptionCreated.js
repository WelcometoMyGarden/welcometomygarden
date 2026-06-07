const { logger } = require('firebase-functions/v2');
const { isWTMGSubscription } = require('./util');
const { DateTime } = require('luxon');
const { getFunctionUrl } = require('../../firebase');
const { getFunctions } = require('firebase-admin/functions');
const getFirebaseUserId = require('../getFirebaseUserId');
const fail = require('../../util/fail');
const stripe = require('../stripe');
const { projectID } = require('firebase-functions/params');

/**
 * Only sent when the subscription is created.
 * @param {import('stripe').Stripe.CustomerSubscriptionCreatedEvent} event
 * @param {EResponse} res
 */
module.exports = async (event, res) => {
  logger.log('Handling customer.subscription.created', { eventId: event.id });
  const subscription = event.data.object;
  if (!isWTMGSubscription(subscription)) {
    logger.log('Ignoring non-WTMG subscription');
    return res.sendStatus(200);
  }

  // Enqueue abandoned cart reminder check
  // Calculate the time at which we want to send the reminder email (in the 'Europe/Brussels' timezone)

  const uid = await getFirebaseUserId(subscription.customer);
  const subCreationTime = DateTime.fromSeconds(subscription.start_date).setZone('Europe/Brussels');
  const startOfDay = subCreationTime.startOf('day');
  const { hour } = subCreationTime;
  let scheduledTime;
  if (hour >= 17) {
    // abandoned after or on 17:00 (>= 17:00) -> send at 7am the next day
    scheduledTime = startOfDay.plus({ day: 1, hours: 7 });
  } else if (hour <= 5) {
    // abandoned before 6:00am (<= 5:59) -> send at 7am
    scheduledTime = startOfDay.plus({ hours: 7 });
  } else if (hour <= 9) {
    // abandoned after & incl 6:00am, but before 10am (<= 9:59) -> send at 11am
    scheduledTime = startOfDay.plus({ hours: 11 });
  } else if (hour <= 16) {
    // abandoned after & incl 10:00am, but before 5pm (<= 16:59) -> send at 6pm
    scheduledTime = startOfDay.plus({ hours: 18 });
  } else {
    logger.error(
      `Failed to schedule abandoned cart check for sub created at ${subCreationTime.toISO()} / ${subscription.customer}, the logic should cover all options.`
    );
    fail('internal');
  }

  logger.info(
    `Enqueued an abandoned cart check at ${scheduledTime.toISO()} for ${uid} / ${subscription.customer}`
  );

  const [resourceName, targetUri] = await getFunctionUrl('sendMessage');
  /**
   * @type {TaskQueue<QueuedMessage>}
   */
  const sendMessageQueue = getFunctions().taskQueue(resourceName);
  await sendMessageQueue.enqueue(
    {
      type: 'abandoned_cart',
      data: {
        uid,
        // @ts-ignore
        customerId: subscription.customer
      }
    },
    {
      scheduleTime: scheduledTime.toJSDate(),
      ...(targetUri
        ? {
            uri: targetUri
          }
        : {})
    }
  );

  try {
    if (!subscription.customer) {
      // Type guard; a just-made sub should have a customer
      res.sendStatus(500);
    }
    if (projectID.value() === 'wtmg-production') {
      // Check if this could be an unexpected double subscription
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: /** @type {string} */ (subscription.customer),
        created: {
          // > 15 minutes ago
          gt: Math.floor(new Date().getTime() / 1000) - 15 * 60
        }
      });
      const priorWTMGSubs = existingSubscriptions.data.filter(
        (s) => s.id !== subscription.id && isWTMGSubscription(s)
      );

      if (priorWTMGSubs.length > 0) {
        logger.error('Weird double+ subscription situation detected', {
          customer: subscription.customer
        });
      }
    }
  } catch (e) {
    logger.error('Error while checking for double subscription', { e });
  }

  return res.sendStatus(200);
};

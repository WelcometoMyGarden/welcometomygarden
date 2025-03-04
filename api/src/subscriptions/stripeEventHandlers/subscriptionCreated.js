const { logger } = require('firebase-functions/v2');
const { isWTMGSubscription } = require('./util');
const { DateTime } = require('luxon');
const { getFunctionUrl } = require('../../firebase');
const { getFunctions } = require('firebase-admin/functions');
const getFirebaseUserId = require('../getFirebaseUserId');

/**
 * Only sent when the subscription is created.
 * @param {import('stripe').Stripe.Event} event
 * @param {import('express').Response} res
 */
module.exports = async (event, res) => {
  logger.log('Handling customer.subscription.created');
  /** @type {import('stripe').Stripe.Subscription} */
  // @ts-ignore
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
  if (hour > 17) {
    // abandoned after 5pm -> send at 7am the next day
    scheduledTime = startOfDay.plus({ day: 1, hours: 7 });
  } else if (hour <= 6) {
    // abandoned before incl 6am -> send at 7am
    scheduledTime = startOfDay.plus({ hours: 7 });
  } else if (hour > 6 && hour <= 10) {
    // abandoned after 6am, but before incl 10am -> send at 11am
    scheduledTime = startOfDay.plus({ hours: 11 });
  } else if (hour > 10 && hour <= 17) {
    // abandoned after 10am, but before incl 5pm -> send at 6pm
    scheduledTime = startOfDay.plus({ hours: 18 });
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

  return res.sendStatus(200);
};

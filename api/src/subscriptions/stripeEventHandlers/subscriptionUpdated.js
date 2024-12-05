//
const { logger } = require('firebase-functions/v2');
const getFirebaseUserId = require('../getFirebaseUserId');
const { stripeSubscriptionKeys } = require('../constants');
const removeUndefined = require('../../util/removeUndefined');
const { db } = require('../../firebase');
const { isWTMGSubscription } = require('./util');
const stripe = require('../stripe');

const {
  priceIdKey,
  statusKey,
  cancelAtKey,
  canceledAtKey,
  currentPeriodEndKey,
  currentPeriodStartKey,
  latestInvoiceStatusKey
} = stripeSubscriptionKeys;

/**
 * Sent when the subscription is successfully started, after the payment is confirmed.
 * Also sent whenever a subscription is changed. For example, adding a coupon, applying a discount, adding an invoice item, and changing plans all trigger this event.
 * @param {*} event
 * @param {*} res
 */
module.exports = async (event, res) => {
  logger.log('Handling subscription.updated');
  /** @type {import('stripe').Stripe.Subscription} */
  const subscription = event.data.object;
  if (!isWTMGSubscription(subscription)) {
    logger.log('Ignoring non-WTMG subscription');
    return res.sendStatus(200);
  }

  const uid = await getFirebaseUserId(subscription.customer);

  // Double-check: this event may be caused by a voided invoice from someone coming back to pay after leaving this first sub invoice unpaid for 1+ day.
  // In this case, the subscription callable code will void the invoice (triggering this update), cancel the current sub, immediately start a new sub too,
  // which may lead to a race conditon. Only the recentmost subscription should be allowed through.
  const latestInvoice = await stripe.invoices.retrieve(
    /** @type {string} */ (subscription.latest_invoice)
  );
  if (latestInvoice.status === 'void') {
    // Refetch this subscription to check if it changed since the receipt of this event.
    const refetchedSub = await stripe.subscriptions.retrieve(subscription.id);
    if (refetchedSub.status === 'canceled') {
      // We only want to ignore this specific situation.
      // A normal void invoice update exists when a price is changed on an active/unpaid sub (not canceled).
      logger.warn(
        'The subscription status has changed since the triggering of this event, ignoring to prevent race condition overwrites'
      );
      return res.sendStatus(200);
      // Optional: check if a new sub was created within seconds of this event for further qualification, but this is probably not necesary.
    }
  }

  // Save updated subscription state in Firebase
  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
  await privateUserProfileDocRef.update(
    removeUndefined({
      [statusKey]: subscription.status,
      [priceIdKey]: subscription.items.data[0].price.id,
      [cancelAtKey]: subscription.cancel_at,
      [canceledAtKey]: subscription.canceled_at,
      [currentPeriodStartKey]: subscription.current_period_start,
      [currentPeriodEndKey]: subscription.current_period_end,
      [latestInvoiceStatusKey]: subscription.latest_invoice.status
      // startDate should not have changed
    })
  );

  if (subscription.status === 'past_due') {
    // NOTE there may a possibility here to send an email telling that a subscription will end if they don't renew
    // check settings here https://stripe.com/docs/billing/revenue-recovery
    // Careful however: subs may become past due when a payment fails a single time, also for the original/first period payment.
    // The current approach of instead using invoice.created for this behavior is probably more appropriate.
    logger.log(`${subscription.id} marked past_due`);
  }

  // Don't do anything for now.
  return res.sendStatus(200);
};

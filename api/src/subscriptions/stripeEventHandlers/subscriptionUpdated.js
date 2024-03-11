// @ts-check
//
const getFirebaseUserId = require('../getFirebaseUserId');
const { stripeSubscriptionKeys } = require('../constants');
const removeUndefined = require('../../util/removeUndefined');
const { db } = require('../../firebase');
const { isWTMGSubscription } = require('./util');

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
  console.log('Handling subscription.updated');
  /** @type {import('stripe').Stripe.Subscription} */
  const subscription = event.data.object;
  if (!isWTMGSubscription(subscription)) {
    console.log('Ignoring non-WTMG subscription');
    return res.sendStatus(200);
  }

  const uid = await getFirebaseUserId(subscription.customer);

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

  // TODO
  if (subscription.status === 'past_due') {
    // TODO send email telling that their subscription will end if they don't renew
    // check settings here https://stripe.com/docs/billing/revenue-recovery
    // TODO careful: subs may become past due when a payment fails a single time
    console.log(`${subscription.id} marked past_due`);
  }

  // Don't do anything for now.
  return res.sendStatus(200);
};

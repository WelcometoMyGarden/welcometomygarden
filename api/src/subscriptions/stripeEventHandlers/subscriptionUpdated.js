//
const { logger } = require('firebase-functions/v2');
const { error, log } = require('firebase-functions/logger');
const getFirebaseUserId = require('../getFirebaseUserId');
const { stripeSubscriptionKeys } = require('../constants');
const removeUndefined = require('../../util/removeUndefined');
const { getUserDocRefsWithData } = require('../../firebase');
const { isWTMGSubscription } = require('./util');
const stripe = require('../stripe');
const { nowSecs } = require('../../util/time');
const { sendSubscriptionCancellationFeedbackEmail } = require('../../mail');

const {
  priceIdKey,
  statusKey,
  cancelAtKey,
  canceledAtKey,
  currentPeriodEndKey,
  currentPeriodStartKey,
  latestInvoiceStatusKey,
  collectionMethodKey
} = stripeSubscriptionKeys;

/**
 * Sent when the subscription status or details change.
 * Generally sent for Bancontact & iDEAL payments when:
 *   1) the payment is initiated (will always result in a payment_intent.requires_action + invoice.payment_failed + invoice.payment_action_required for async verification), it's counterintuitive because nothing actually fails,
 *   but that action_required makes the subscription status turn to "past_due"
 *   2) again when the payment is confirmed, because the status went back to "active" and now with setup_future_usage the default payment method is also set up.
 * Also sent whenever a subscription is changed. For example, adding a coupon, applying a discount, adding an invoice item, and changing plans all trigger this event.
 * @param {import('stripe').Stripe.Event} event
 * @param {import('express').Response} res
 */
module.exports = async (event, res) => {
  logger.log('Handling customer.subscription.updated');
  /** @type {import('stripe').Stripe.Subscription} */
  // @ts-ignore
  const subscription = event.data.object;
  if (!isWTMGSubscription(subscription)) {
    logger.log('Ignoring non-WTMG subscription');
    return res.sendStatus(200);
  }

  // Double-check: this event may be caused by a voided invoice from someone coming back to pay after leaving this first sub invoice unpaid for 1+ day.
  // In this case, the subscription callable code will void the invoice (triggering this update), cancel the current sub, immediately start a new sub too,
  // which may lead to a race conditon. Only the recentmost subscription should be allowed through.
  const latestInvoice = await stripe.invoices.retrieve(
    /** @type {string} */ (subscription.latest_invoice)
  );
  if (latestInvoice.status === 'void') {
    // Refetch this subscription to check if it changed since the receipt of this event.
    // Note: This is under the assumption that the unsubscribe API call will have materialized *before* the handling of these lines
    // (reasonable assumption given that the unsubscribe is called immediately after voiding the invoice, while code block incurs delays due to
    //  1. the inherent Stripe event delay, 2. the above Firebase auth retrieval + the above stripe invoice retrieval)
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

  // Get required data
  const uid = await getFirebaseUserId(subscription.customer);
  const { customer: customerId, current_period_end } = subscription;
  if (!uid) {
    error(`Could not find a Firebase UID for customer ${customerId}`);
    return res.sendStatus(500);
  }

  const { privateUserProfileDocRef, publicUserProfileData, privateUserProfileData } =
    await getUserDocRefsWithData(uid);

  // Save updated subscription state in Firebase
  /**
   * @type {DocumentReference<UserPrivate>}
   */
  await privateUserProfileDocRef.update(
    removeUndefined({
      [statusKey]: subscription.status,
      [priceIdKey]: subscription.items.data[0].price.id,
      [cancelAtKey]: subscription.cancel_at,
      [canceledAtKey]: subscription.canceled_at,
      [currentPeriodStartKey]: subscription.current_period_start,
      [currentPeriodEndKey]: subscription.current_period_end,
      [latestInvoiceStatusKey]: latestInvoice.status,
      [collectionMethodKey]: subscription.collection_method
      // startDate should not have changed
    })
  );

  // If the subscription is going to be cancelled at the end of the period in the future,
  // the customer must have made this change (or us in the dashboard, manually)
  //
  // Send the confirmation + feedback email
  if (
    subscription.collection_method === 'charge_automatically' &&
    subscription.cancel_at_period_end &&
    // @ts-ignore
    event.data.previous_attributes.cancel_at_period_end === false &&
    typeof subscription.cancel_at === 'number' &&
    nowSecs() < subscription.cancel_at
  ) {
    // First double check that the customer wasn't deleted, and get the email address through Stripe.
    const customerResponse = await stripe.customers.retrieve(/** @type {string} */ (customerId));

    if (customerResponse.deleted) {
      error(
        `Unexpected situation: ${customerResponse.id} was deleted before handling a subscription.updated event`
      );
      return res.sendStatus(500);
    }

    // A workaround re-assign to get the typecast to work more easily...
    const customer = /** @type {import('stripe').Stripe.Customer & {lastResponse: any}} */ (
      customerResponse
    );

    const endDate = new Intl.DateTimeFormat(privateUserProfileData.communicationLanguage ?? 'en', {
      // 17 december 2024
      dateStyle: 'long'
    }).format(current_period_end * 1000);

    log(
      `${customerId} cancelled ${subscription.id}, ending on ${endDate}. Sending a confirmation email.`
    );

    await sendSubscriptionCancellationFeedbackEmail(
      customer.email,
      publicUserProfileData.firstName,
      privateUserProfileData.communicationLanguage,
      endDate
    );
  }

  return res.sendStatus(200);
};

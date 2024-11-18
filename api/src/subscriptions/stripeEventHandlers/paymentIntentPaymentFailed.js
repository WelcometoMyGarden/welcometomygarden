const { logger } = require('firebase-functions/v2');
const getFirebaseUserId = require('../getFirebaseUserId');
const { stripeSubscriptionKeys } = require('../constants');
const { db } = require('../../firebase');
const stripe = require('../stripe');
const { isWTMGInvoice } = require('./util');
const { getLatestCharge } = require('./shared');

const { latestInvoiceStatusKey, paymentProcessingKey } = stripeSubscriptionKeys;

/**
 *
 * Special case handling of SEPA Debit, where we consider a "declined_by_network " payment that happened
 * after a "paymentProcessing" state to be a failure to finalize the original payment. The tentative membership
 * should then immediately be rescinded (before the subscription is deleted, since it may still be repaid again)
 * TODO: maybe an email should go out here, since we've already sent a thank you email at this point
 * @param {import('stripe').Stripe.Event} event
 * @returns
 */
module.exports = async (event, res) => {
  logger.log('Handling payment_intent.payment_failed');
  const paymentIntent = /** @type {import('stripe').Stripe.PaymentIntent} */ (event.data.object);

  // Check if this payment was approved.
  /**
   * @type {import('stripe').Stripe.Charge}
   */
  const latestCharge = await getLatestCharge(event);

  /**
   * Filter out any declined sepa_debit charge
   * @param {import('stripe').Stripe.Charge} param0
   * @returns
   */
  const isDeclinedSepaCharge = ({ payment_method_details, status }) =>
    payment_method_details?.type === 'sepa_debit' && status === 'failed';

  // Check if an eligible charge exists, and a related invoice, otherwise ignore
  if (
    !latestCharge ||
    !isDeclinedSepaCharge(latestCharge) ||
    typeof paymentIntent.invoice !== 'string' // shouldn't happen, helps narrow down the tiype
  ) {
    logger.log('Skpping non (SEPA + failed) charge');
    return res.sendStatus(200);
  }

  // --- Qualify the event further based on the linked invoice ---
  // Fetch the related invoice
  const invoice = await stripe.invoices.retrieve(paymentIntent.invoice);

  // Check if the invoice is a WTMG invoice
  if (!(await isWTMGInvoice(invoice))) {
    // Ignore invoices that were created for payment events not related to WTMG subscriptions
    logger.log('Ignoring non-WTMG payment processing event');
    return res.sendStatus(200);
  }

  // Check if the invoice is related to a subscription
  if (
    !(
      // when creating
      (
        invoice.billing_reason === 'subscription_create' ||
        invoice.metadata?.billing_reason_override === 'subscription_create' ||
        // when renewing
        invoice.billing_reason === 'subscription_cycle'
      )
    )
  ) {
    logger.log('Ignoring non-WTMG payment processing event');
    return res.sendStatus(200);
  }

  // --- Actually process the event ---

  // Get the Firebase user
  const uid = await getFirebaseUserId(paymentIntent.customer);
  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
  const privateUserProfileData = (await privateUserProfileDocRef.get()).data();

  const publicUserProfileDocRef = db.doc(`users/${uid}`);

  // In case a previous sepa payment was processing (this should always be the case)
  // which now failed, mark it as such and unmake superfan
  if (privateUserProfileData.stripeSubscription.paymentProcessing) {
    logger.log(
      `User ${uid} <${invoice.customer_email}> was marked as having a processing SEPA payment. ` +
        `The charge failed, so we're cancelling it and removing their superfan status.`
    );
    await privateUserProfileDocRef.update({
      // Set the user's latest invoice state
      [latestInvoiceStatusKey]: invoice.status,
      [paymentProcessingKey]: false
    });

    // Unmake a superfan
    await publicUserProfileDocRef.update({
      superfan: false
    });
    //
    // TODO: should we send an error email? See above
  } else {
    logger.log(
      `User ${uid} <${invoice.customer_email}> was not marked as having a processing payment. Doing nothing.`
    );
  }

  return res.sendStatus(200);
};

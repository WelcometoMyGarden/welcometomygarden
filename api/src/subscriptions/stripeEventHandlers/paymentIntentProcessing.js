const { logger } = require('firebase-functions/v2');
const getFirebaseUserId = require('../getFirebaseUserId');
const {
  sendSubscriptionConfirmationEmail,
  sendSubscriptionManualRenewalThankYouEmail,
  sendSubscriptionAutomaticRenewalThankYouEmail
} = require('../../mail');
const { stripeSubscriptionKeys } = require('../constants');
const { getUserDocRefsWithData } = require('../../firebase');
const stripe = require('../stripe');
const { isWTMGInvoice } = require('./util');
const { getLatestCharge } = require('./shared');

const { latestInvoiceStatusKey, paymentProcessingKey } = stripeSubscriptionKeys;

/**
 *
 * Inform Firebase of an approved, processing payment + send membership confirmation email
 * Special case handling of SEPA Debit, where we consider an "network approved" initiated payment
 * already fully closed & settled.
 * ("first thank you" email, or the "thank you for renewing" email)
 * @param {import('stripe').Stripe.Event} event
 * @returns
 */
module.exports = async (event, res) => {
  logger.log('Handling payment_intent.processing');
  const paymentIntent = /** @type {import('stripe').Stripe.PaymentIntent} */ (event.data.object);

  // Check if this payment was approved.
  /**
   * @type {import('stripe').Stripe.Charge}
   */
  const latestCharge = await getLatestCharge(event);
  /**
   *
   * @param {import('stripe').Stripe.Charge} param0
   * @returns
   */
  const isApprovedSepaCharge = ({ outcome, payment_method_details, status }) =>
    outcome?.network_status === 'approved_by_network' &&
    payment_method_details?.type === 'sepa_debit' &&
    status === 'pending';

  // Check if an eligible charge exists, and a related invoice
  if (
    !latestCharge ||
    !isApprovedSepaCharge(latestCharge) ||
    typeof paymentIntent.invoice !== 'string' // shouldn't happen, helps narrow down the tiype
  ) {
    logger.log('Skipping non (SEPA + approved + pending) charge');
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

  // Check if the invoice is related to subscription creation
  if (
    !(
      invoice.billing_reason === 'subscription_create' ||
      invoice.metadata?.billing_reason_override === 'subscription_create' ||
      invoice.billing_reason === 'subscription_cycle'
    )
  ) {
    logger.log('Ignoring SEPA charge unrelated to a subscription');
    return res.sendStatus(200);
  }

  // --- Actually process the event ---

  // Get the Firebase user
  const uid = await getFirebaseUserId(paymentIntent.customer);
  const {
    privateUserProfileDocRef,
    privateUserProfileData,
    publicUserProfileDocRef,
    publicUserProfileData
  } = await getUserDocRefsWithData(uid);

  // Ensure the user is marked as a superfan, with a payment processing indication.
  logger.log(
    `Marking ${uid} <${invoice.customer_email}> as a provisional superfan, awaiting final confirmation.`
  );
  await Promise.all([
    publicUserProfileDocRef.update({
      superfan: true
    }),
    privateUserProfileDocRef.update({
      // Set the user's latest invoice state
      // Empirically, we know that this status is "open"
      [latestInvoiceStatusKey]: invoice.status,
      [paymentProcessingKey]: true
    })
  ]);

  if (!(invoice.customer_email && publicUserProfileData && privateUserProfileData)) {
    logger.error('Unexpected falsy Firestore user data');
    return res.sendStatus(500);
  }

  // Send a payment confirmation email
  if (
    invoice.billing_reason === 'subscription_create' ||
    invoice.metadata?.billing_reason_override === 'subscription_create'
  ) {
    logger.log(`Sending subscription confirmation email to ${uid} <${invoice.customer_email}>`);
    await sendSubscriptionConfirmationEmail(
      invoice.customer_email,
      publicUserProfileData.firstName,
      privateUserProfileData.communicationLanguage
    );
  } else if (invoice.billing_reason === 'subscription_cycle') {
    // TODO: charge_automatically SEPA renewal payments should also reach here.
    // We probably want to send them a different email.
    const params = /** @type {const} */ ([
      invoice.customer_email,
      publicUserProfileData.firstName,
      privateUserProfileData.communicationLanguage
    ]);
    if (privateUserProfileData.stripeSubscription.collectionMethod !== 'charge_automatically') {
      logger.log(
        `Sending subscription manual renewal thank you email to ${uid} <${invoice.customer_email}>`
      );
      await sendSubscriptionManualRenewalThankYouEmail(...params);
    } else {
      logger.log(
        `Sending subscription automatic renewal thank you email to ${uid} <${invoice.customer_email}>`
      );
      await sendSubscriptionAutomaticRenewalThankYouEmail(...params);
    }
  }

  return res.sendStatus(200);
};

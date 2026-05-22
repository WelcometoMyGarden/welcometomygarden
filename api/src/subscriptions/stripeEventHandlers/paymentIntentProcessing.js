const { logger } = require('firebase-functions/v2');
const getFirebaseUserId = require('../getFirebaseUserId');
const {
  sendSubscriptionConfirmationEmail,
  sendSubscriptionManualRenewalThankYouEmail,
  sendSubscriptionAutomaticRenewalThankYouEmail
} = require('../../mail');
const { stripeSubscriptionKeys } = require('../constants');
const { getUserDocRefsWithData } = require('../../firebase');
const { isWTMGInvoice } = require('./util');
const { getLatestCharge } = require('./shared');
const { getInvoiceForPaymentIntent } = require('../basilCompat');

const { latestInvoiceStatusKey, paymentProcessingKey } = stripeSubscriptionKeys;

/**
 *
 * Inform Firebase of an approved, processing payment + send membership confirmation email
 * Special case handling of SEPA Debit, where we consider an "network approved" initiated payment
 * already fully closed & settled.
 * ("first thank you" email, or the "thank you for renewing" email)
 * @param {import('stripe').Stripe.PaymentIntentProcessingEvent} event
 * @param {EResponse} res
 * @returns
 */
module.exports = async (event, res) => {
  logger.log('Handling payment_intent.processing', { eventId: event.id });
  const paymentIntent = event.data.object;

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

  // Check if an eligible charge exists
  if (!latestCharge || !isApprovedSepaCharge(latestCharge)) {
    logger.log('Skipping non (SEPA + approved + pending) charge');
    return res.sendStatus(200);
  }

  // --- Qualify the event further based on the linked invoice ---
  // Basil: PaymentIntent.invoice was removed; map back via InvoicePayment.
  const invoice = await getInvoiceForPaymentIntent(paymentIntent.id);
  if (!invoice) {
    logger.log('Skipping payment_intent.processing with no linked invoice');
    return res.sendStatus(200);
  }

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
    await sendSubscriptionConfirmationEmail({
      email: invoice.customer_email,
      firstName: publicUserProfileData.firstName,
      language: privateUserProfileData.communicationLanguage
    });
  } else if (invoice.billing_reason === 'subscription_cycle') {
    // TODO: charge_automatically SEPA renewal payments should also reach here.
    // We probably want to send them a different email.
    const emailConfig = {
      email: invoice.customer_email,
      firstName: publicUserProfileData.firstName,
      language: privateUserProfileData.communicationLanguage
    };
    if (privateUserProfileData.stripeSubscription.collectionMethod !== 'charge_automatically') {
      logger.log(
        `Sending subscription manual renewal thank you email to ${uid} <${invoice.customer_email}>`
      );
      await sendSubscriptionManualRenewalThankYouEmail(emailConfig);
    } else {
      logger.log(
        `Sending subscription automatic renewal thank you email to ${uid} <${invoice.customer_email}>`
      );
      await sendSubscriptionAutomaticRenewalThankYouEmail(emailConfig);
    }
  }

  return res.sendStatus(200);
};

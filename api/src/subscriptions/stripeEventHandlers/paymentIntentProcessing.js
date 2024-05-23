/* eslint-disable camelcase */
const getFirebaseUserId = require('../getFirebaseUserId');
const {
  sendSubscriptionConfirmationEmail,
  sendSubscriptionRenewalThankYouEmail
} = require('../../mail');
const { stripeSubscriptionKeys } = require('../constants');
const { db } = require('../../firebase');
const stripe = require('../stripe');
const { isWTMGInvoice } = require('./util');

const { latestInvoiceStatusKey, paymentProcessingKey } = stripeSubscriptionKeys;

/**
 *
 * Inform Firebase of an approved, processing payment + send membership confirmation email
 * Special case handling of SOFORT, where we consider an "network approved" initiated payment
 * already fully closed & settled.
 * ("first thank you" email, or the "thank you for renewing" email)
 * @param {import('stripe').Stripe.Event} event
 * @returns
 */
module.exports = async (event, res) => {
  console.log('Handling payment_intent.processing');
  const paymentIntent = /** @type {import('stripe').Stripe.PaymentIntent} */ (event.data.object);

  // --- Do pre-checks for the usefulness of this event for WTMG ---
  // Make sure charges are listed for the paymentIntent
  // @ts-ignore
  if (!(paymentIntent?.charges?.data instanceof Array)) {
    return res.sendStatus(200);
  }

  // Check if this payment was approved.
  // By checking, we've seen that charges is part of the event object
  const processingCharge = /** @type {import('stripe').Stripe.Charge[]} */ (
    // @ts-ignore
    paymentIntent.charges.data
  ).find(
    ({ outcome, payment_method_details, status }) =>
      outcome?.network_status === 'approved_by_network' &&
      payment_method_details?.type === 'sofort' &&
      status === 'pending'
  );

  // Check if an eligible charge exists, and a related invoice
  if (!processingCharge || typeof paymentIntent.invoice !== 'string') {
    return res.sendStatus(200);
  }

  // --- Qualify the event further based on the linked invoice ---
  // Fetch the related invoice
  const invoice = await stripe.invoices.retrieve(paymentIntent.invoice);

  // Check if the invoice is a WTMG invoice
  if (!(await isWTMGInvoice(invoice))) {
    // Ignore invoices that were created for payment events not related to WTMG subscriptions
    console.log('Ignoring non-WTMG payment processing event');
    return res.sendStatus(200);
  }

  // Check if the invoice is related to subscription creation
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
    return res.sendStatus(200);
  }

  // --- Actually process the event ---

  // Get the Firebase user
  const uid = await getFirebaseUserId(paymentIntent.customer);
  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
  const privateUserProfileData = (await privateUserProfileDocRef.get()).data();

  // Ensure the user is marked as a superfan, with a payment processing indication.
  const publicUserProfileDocRef = db.doc(`users/${uid}`);
  const publicUserProfileData = (await publicUserProfileDocRef.get()).data();
  await publicUserProfileDocRef.update({
    superfan: true
  });
  await privateUserProfileDocRef.update({
    // Set the user's latest invoice state
    // Empirically, we know that this status is "open"
    [latestInvoiceStatusKey]: invoice.status,
    [paymentProcessingKey]: true
  });

  if (!(invoice.customer_email && publicUserProfileData && privateUserProfileData)) {
    console.error('Unexpected falsy Firestore user data');
    return res.sendStatus(500);
  }

  // Send a payment confirmation email
  if (
    invoice.billing_reason === 'subscription_create' ||
    invoice.metadata?.billing_reason_override === 'subscription_create'
  ) {
    sendSubscriptionConfirmationEmail(
      invoice.customer_email,
      publicUserProfileData.firstName,
      privateUserProfileData.communicationLanguage
    );
  } else if (invoice.billing_reason === 'subscription_cycle') {
    sendSubscriptionRenewalThankYouEmail(
      invoice.customer_email,
      publicUserProfileData.firstName,
      privateUserProfileData.communicationLanguage
    );
  }

  return res.sendStatus(200);
};

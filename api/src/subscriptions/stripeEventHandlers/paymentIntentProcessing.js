// @ts-check
/* eslint-disable camelcase */
const getFirebaseUserId = require('../getFirebaseUserId');
const { sendSubscriptionConfirmationEmail } = require('../../mail');
const { stripeSubscriptionKeys } = require('../constants');
const { db } = require('../../firebase');
const stripe = require('../stripe');

const { latestInvoiceStatusKey, paymentProcessingKey } = stripeSubscriptionKeys;

/**
 * Inform Firebase of an approved, processing payment + send membership email
 * @param {import('stripe').Stripe.Event} event
 * @returns
 */
module.exports = async (event, res) => {
  console.log('Handling payment_intent.processing');
  const paymentIntent = /** @type {import('stripe').Stripe.PaymentIntent} */ (event.data.object);
  const uid = await getFirebaseUserId(paymentIntent.customer);

  // Set the user's latest invoice state
  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
  const privateUserProfileData = (await privateUserProfileDocRef.get()).data();

  // Make sure charges are listed for the paymentIntent
  // @ts-ignore
  if (!(paymentIntent?.charges?.data instanceof Array)) {
    return res.sendStatus(200);
  }

  // Check if this payment was approved.
  // Empirically, charges is part of the event object
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

  // Fetch the related invoice
  const invoice = await stripe.invoices.retrieve(paymentIntent.invoice);

  // Check if the invoice is related to subscription creation
  if (
    !(
      invoice.billing_reason === 'subscription_create' ||
      invoice.metadata?.billing_reason_override === 'subscription_create'
    )
  ) {
    return res.sendStatus(200);
  }

  // Ensure the user is marked as a superfan, with a payment processing indication.
  const publicUserProfileDocRef = db.doc(`users/${uid}`);
  const publicUserProfileData = (await publicUserProfileDocRef.get()).data();
  await publicUserProfileDocRef.update({
    superfan: true
  });
  await privateUserProfileDocRef.update({
    // Empirically, we know that this status is "open"
    [latestInvoiceStatusKey]: invoice.status,
    [paymentProcessingKey]: true
  });

  if (!(invoice.customer_email && publicUserProfileData && privateUserProfileData)) {
    console.error('Unexpected falsy Firestore user data');
    return res.sendStatus(500);
  }

  // Send a superfan email
  sendSubscriptionConfirmationEmail(
    invoice.customer_email,
    publicUserProfileData.firstName,
    privateUserProfileData.communicationLanguage
  );

  return res.sendStatus(200);
};

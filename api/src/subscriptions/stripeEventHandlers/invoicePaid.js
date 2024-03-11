const getFirebaseUserId = require('../getFirebaseUserId');
const {
  sendSubscriptionConfirmationEmail,
  sendSubscriptionRenewalThankYouEmail
} = require('../../mail');
const { stripeSubscriptionKeys } = require('../constants');
const { db } = require('../../firebase');
const { isWTMGInvoice } = require('./util');

const { latestInvoiceStatusKey, paymentProcessingKey } = stripeSubscriptionKeys;

/**
 * Mark the user's last invoice as paid
 * Triggers in all cases:
 * 'billing_reason': 'subscription_create', 'subscription_cycle', 'subscription_update', 'subscription_threshold'
 * TODO: Should we check that this _is_ indeed the user's last invoice?
 * TODO: should we include the link to a receipt?
 * @returns
 */
module.exports = async (event, res) => {
  console.log('Handling invoice.paid');
  const invoice = event.data.object;
  if (!isWTMGInvoice(invoice)) {
    console.log('Ignoring non-WTMG invoice');
    return res.sendStatus(200);
  }
  const uid = await getFirebaseUserId(invoice.customer);

  // Set the user's latest invoice state
  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
  const privateUserProfileData = (await privateUserProfileDocRef.get()).data();

  const paymentWasProcessing =
    privateUserProfileData.stripeSubscription?.paymentProcessing === true;

  await privateUserProfileDocRef.update({
    [latestInvoiceStatusKey]: invoice.status,
    // If a payment was processing, mark it as processed.
    ...(paymentWasProcessing ? { [paymentProcessingKey]: false } : {})
  });

  // Ensure the user is marked as a superfan.
  const publicUserProfileDocRef = db.doc(`users/${uid}`);
  const publicUserProfileData = (await publicUserProfileDocRef.get()).data();
  if (publicUserProfileData.superfan !== true) {
    await publicUserProfileDocRef.update({ superfan: true });
  }

  // Send a confirmation email in case it was not sent yet
  // (we already send a confirmation email in paymentIntentProcessing.js when this flag is true)
  if (!paymentWasProcessing) {
    if (
      invoice.billing_reason === 'subscription_create' ||
      invoice.metadata.billing_reason_override === 'subscription_create'
    ) {
      // this is the paid invoice for the first subscription
      sendSubscriptionConfirmationEmail(
        invoice.customer_email,
        publicUserProfileData.firstName,
        privateUserProfileData.communicationLanguage
      );
    }

    if (invoice.billing_reason === 'subscription_cycle') {
      // Overrides of invoices should not be possible on subscription cycles (at the time of writing)
      // But with SOFORT, paymetnProcessing on renewals is (or should be) possible.
      sendSubscriptionRenewalThankYouEmail(
        invoice.customer_email,
        publicUserProfileData.firstName,
        privateUserProfileDocRef.communicationLanguage
      );
    }
  }

  return res.sendStatus(200);
};

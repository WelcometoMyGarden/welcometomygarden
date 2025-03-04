const { logger } = require('firebase-functions/v2');
const getFirebaseUserId = require('../getFirebaseUserId');
const {
  sendSubscriptionConfirmationEmail,
  sendSubscriptionRenewalThankYouEmail
} = require('../../mail');
const { stripeSubscriptionKeys } = require('../constants');
const { getUserDocRefsWithData } = require('../../firebase');
const { isWTMGInvoice } = require('./util');
const stripe = require('../stripe');

const { latestInvoiceStatusKey, paymentProcessingKey, collectionMethodKey } =
  stripeSubscriptionKeys;

/**
 * Mark the user's last invoice as paid
 * Triggers in all cases:
 * 'billing_reason': 'subscription_create', 'subscription_cycle', 'subscription_update', 'subscription_threshold'
 * TODO: Should we check that this _is_ indeed the user's last invoice?
 * TODO: should we include the link to a receipt?
 * @returns
 */
module.exports = async (event, res) => {
  logger.log('Handling invoice.paid');
  /** @type {import('stripe').Stripe.Invoice} */
  const invoice = event.data.object;
  if (!(await isWTMGInvoice(invoice))) {
    logger.log('Ignoring non-WTMG invoice');
    return res.sendStatus(200);
  }
  const uid = await getFirebaseUserId(invoice.customer);

  const {
    privateUserProfileDocRef,
    privateUserProfileData,
    publicUserProfileDocRef,
    publicUserProfileData
  } = await getUserDocRefsWithData(uid);

  // Set the user's latest invoice state

  const paymentWasProcessing =
    privateUserProfileData.stripeSubscription?.paymentProcessing === true;

  await Promise.all([
    // Update private profile data
    privateUserProfileDocRef.update({
      [latestInvoiceStatusKey]: invoice.status,
      // If a payment was processing, mark it as processed.
      ...(paymentWasProcessing ? { [paymentProcessingKey]: false } : {})
    }),
    // Update public profile data, ensure the user is marked as a superfan.
    publicUserProfileData.superfan !== true
      ? publicUserProfileDocRef.update({ superfan: true })
      : Promise.resolve()
  ]);

  // TODO: we should be able to optimize out this call by checking for
  // privateUserProfileData.stripeSubscription.collectionMethod === 'charge_automatically' (or not) below
  // note that send_invoice will mostly not be set there
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);

  // Send confirmation or thank you emails
  // (we already sent these in paymentIntentProcessing.js when `paymentWasProcessing` flag is true)
  if (!paymentWasProcessing) {
    try {
      // Try/catch to avoid Sendgrid errors impacting the switch to charge_automatically below

      // Send a confirmation email in case it was not sent yet
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
        // But with SEPA Debit, paymentProcessing on renewals is (or should be) possible.
        if (subscription.collection_method === 'send_invoice') {
          await sendSubscriptionRenewalThankYouEmail(
            invoice.customer_email,
            publicUserProfileData.firstName,
            privateUserProfileData.communicationLanguage
          );
        } else {
          // TODO: send email with confirmation of the automatic charge
        }
      }
    } catch (e) {
      logger.error(
        `Error while trying to send a subscription payment confirmation/thank you email for ${subscription.id}`,
        e
      );
    }
  }

  // In any case (new or cycle payment), if the subscription is not yet on charge_automatically,
  // update it if possible.
  if (subscription.collection_method === 'send_invoice') {
    // Find a reusable saved payment method
    // NOTE/TODO: it seems that upon the setup_future_usage subscription payment, the reusable payment method is also referred to
    // in the default_payment_method property on the subscription, so that could be used too (as a first preference).
    const paymentMethod = (await stripe.customers.listPaymentMethods(invoice.customer)).data.find(
      (pm) => pm.type === 'sepa_debit' || pm.type === 'card'
    );

    if (paymentMethod) {
      await stripe.subscriptions.update(invoice.subscription, {
        collection_method: 'charge_automatically',
        payment_settings: {
          // From trial and error, I noticed it is required that the bacontact options (currently only preferred language)
          // are reset to null, otherwise bancontact is somehow assumed to be still present, blocking the change to charge_automatically
          // There are no iDEAL options AFAICS.
          payment_method_options: {
            bancontact: null,
            acss_debit: null,
            us_bank_account: null
          },
          // Bancontact/iDEAL themselves can not be auto-charged, so they can not be present in a charge_automatically subscription
          payment_method_types: ['card', 'sepa_debit']
        },
        // Ensure that the payment method saved by set up for future usage will be used in the future.
        default_payment_method: paymentMethod.id
      });

      // Store the collection method in Firebase
      await privateUserProfileDocRef.update({
        [collectionMethodKey]: 'charge_automatically'
      });
    } else {
      logger.error(
        "Couldn't convert a subscription to charge_automatically on invoice.paid because no suitable payment method was found."
      );
    }
  }

  return res.sendStatus(200);
};

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
const stripe = require('../stripe');

const { latestInvoiceStatusKey, paymentProcessingKey, collectionMethodKey } =
  stripeSubscriptionKeys;

/**
 * Mark the user's last invoice as paid, sends new subscription or renewal confirmation/thank you emails as needed.
 * Triggers in all cases:
 * 'billing_reason': 'subscription_create', 'subscription_cycle', 'subscription_update', 'subscription_threshold'
 * TODO: Should we check that this _is_ indeed the user's last invoice?
 * TODO: should we include the link to a receipt?
 * @returns
 * @param {import('stripe').Stripe.InvoicePaidEvent} event
 * @param {EResponse} res
 */
module.exports = async (event, res) => {
  logger.log('Handling invoice.paid', { eventId: event.id });
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

  // Update the user's latest invoice state in Firestore

  // Whether the subscription had a last SEPA payment that was processing
  // TODO: maybe we can also inspect the change in this Stripe event.
  // via event.data.previous_attributes.object
  // Normally the old status should be indicated. Then we don't need this Firestore persistence.
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

  // NOTE: we should be able to optimize out this call for extra details by checking instead for
  // privateUserProfileData.stripeSubscription.collectionMethod === 'charge_automatically' (or not) below
  // NOTE: send_invoice will mostly not be set there, it will be undefined in many cases
  const subscription = await stripe.subscriptions.retrieve(
    /** @type {string} */ (invoice.subscription)
  );

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
        await sendSubscriptionConfirmationEmail(
          invoice.customer_email,
          publicUserProfileData.firstName,
          privateUserProfileData.communicationLanguage
        );
      } else if (invoice.billing_reason === 'subscription_cycle') {
        // Overrides of invoices should not be possible on subscription cycles (at the time of writing)
        // But with SEPA Debit, paymentProcessing on renewals is (or should be) possible.
        const params = /** @type {const} */ ([
          invoice.customer_email,
          publicUserProfileData.firstName,
          privateUserProfileData.communicationLanguage
        ]);
        if (subscription.collection_method === 'send_invoice') {
          await sendSubscriptionManualRenewalThankYouEmail(...params);
        } else {
          // for a charge_automatically renewal
          await sendSubscriptionAutomaticRenewalThankYouEmail(...params);
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
    // in `subscription.default_payment_method`, so that could be used too (as a first preference).
    // NOTE 2: if a SEPA subscription payment method is replaced after the first period, using the dashboard, it will
    // be stored in `customer.invoice_settings.default_payment_method` and `subscription.default_payment_method` will be set to null
    //
    // In any case, the payment methods should still be attached to the customer and findable this way?
    const paymentMethod = (
      await stripe.customers.listPaymentMethods(/** @type {string} */ (invoice.customer))
    ).data.find((pm) => pm.type === 'sepa_debit' || pm.type === 'card');

    if (paymentMethod) {
      await stripe.subscriptions.update(/** @type {string} */ (invoice.subscription), {
        collection_method: 'charge_automatically',
        payment_settings: {
          // From trial and error, I noticed it is required that the bancontact options (currently only preferred language)
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

const { logger } = require('firebase-functions/v2');
const stripe = require('../stripe');
const getFirebaseUserId = require('../getFirebaseUserId');
const { stripeSubscriptionKeys } = require('../constants');
const removeUndefined = require('../../util/removeUndefined');
const { getUserDocRefsWithData } = require('../../firebase');
const { sendSubscriptionRenewalEmail } = require('../../mail');
const { isWTMGInvoice } = require('./util');
/**
 * Handles the `invoice.created` event from Stripe.
 * Only handles WTMG subscription renewal invoices, ignores other invoices.
 *
 * @param {import('stripe').Stripe.InvoiceCreatedEvent} event
 * @param {EResponse} res
 *
 */
module.exports = async (event, res) => {
  logger.log('Handling invoice.created', {
    eventId: event.id
  });
  const invoice = event.data.object;

  // NOTE: we can only rely on this price ID being accurate because we only look for subscription_cycle invoices
  // If we were to handle subscription_update invoices here, the price ID may be different, see [one-off-invoice]
  const isWtmgSubscriptionInvoice = await isWTMGInvoice(invoice);
  const price = invoice.lines.data[0]?.price;
  if (!(isWtmgSubscriptionInvoice && invoice.billing_reason === 'subscription_cycle')) {
    // Ignore invoices that were created for events not related
    // to WTMG subscription renewals
    //
    // NOTE: a subscription creation (first invoice) will have billing_reason `subscription_create`
    logger.debug('Ignoring non-WTMG or non subscription-cycle invoice');
    return res.sendStatus(200);
  }

  const uid = await getFirebaseUserId(invoice.customer);

  // Finalize the invoice
  /** @type {import('stripe').Stripe.Invoice} */
  let finalizedInvoice;
  try {
    finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
  } catch (e) {
    // The invoice may already be finalized immediately after this event is sent when we're working with test clocks,
    // but before this function executes.
    // TODO: verify that this is indeed the error here. Via code?
    // > Error: This invoice is already finalized, you can't re-finalize a non-draft invoice.
    finalizedInvoice = await stripe.invoices.retrieve(invoice.id);
  }
  /**
   * @type {import('stripe').Stripe.Subscription}
   */
  const subscription = await stripe.subscriptions.retrieve(
    /** @type {string} */ (finalizedInvoice.subscription)
  );

  // In case the subscription still has the type send_invoice, immediately set the current PaymentIntent up
  // to collect off-session payments in the future, before sending the email.
  // This is a necessary preparation step to be able to switch the subscription to charge_automatically for the invoice of next year.
  if (subscription.collection_method === 'send_invoice') {
    await stripe.paymentIntents.update(/** @type {string} */ (finalizedInvoice.payment_intent), {
      setup_future_usage: 'off_session'
    });
    logger.log(
      `Set up the next WTMG subscription payment of ${subscription.id} from ${subscription.customer} / ${invoice.customer_email} for future off_session usage`
    );
  }

  const { renewalInvoiceLinkKey, latestInvoiceStatusKey } = stripeSubscriptionKeys;

  if (!finalizedInvoice.hosted_invoice_url) {
    const errorMsg = 'Could not correctly finalize the renewal invoice';
    logger.error(errorMsg);
    res.status(500);
    return res.send(errorMsg);
  }

  // Get public & private data
  const { privateUserProfileDocRef, privateUserProfileData, publicUserProfileData } =
    await getUserDocRefsWithData(uid);

  //
  // Set the user's latest invoice state
  // + save the renewal invoice URL in Firebase
  await privateUserProfileDocRef.update(
    removeUndefined({
      [renewalInvoiceLinkKey]: finalizedInvoice.hosted_invoice_url,
      [latestInvoiceStatusKey]: finalizedInvoice.status
      // startDate should not have changed
    })
  );

  if (
    !(
      publicUserProfileData &&
      // Note: if a superfan has deleted their account during their active period, `privateUserProfileData` should be
      // `undefined`, blocking the renewal email. This is important, because the rest of the data will likely still exist.
      privateUserProfileData &&
      finalizedInvoice.customer_email &&
      finalizedInvoice.hosted_invoice_url &&
      typeof price?.unit_amount === 'number'
    )
  ) {
    res.status(500);
    return res.send('Missing parameters to send a subscription renewal email');
  }

  // Send renewal invoice email
  if (subscription.collection_method === 'send_invoice') {
    await sendSubscriptionRenewalEmail({
      email: finalizedInvoice.customer_email,
      firstName: publicUserProfileData.firstName,
      renewalLink: finalizedInvoice.hosted_invoice_url,
      price: price.unit_amount / 100,
      language: privateUserProfileData.communicationLanguage
    });
  } else {
    // TODO: send a different email for charge_automatically renewals (without link)
  }
  return res.sendStatus(200);
};

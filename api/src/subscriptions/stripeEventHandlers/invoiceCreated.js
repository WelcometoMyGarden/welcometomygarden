const { logger } = require('firebase-functions/v2');
const stripe = require('../stripe');
const getFirebaseUserId = require('../getFirebaseUserId');
const { stripeSubscriptionKeys } = require('../constants');
const removeUndefined = require('../../util/removeUndefined');
const { getUserDocRefsWithData } = require('../../firebase');
const { isWTMGInvoice } = require('./util');
const { getInvoiceSubscriptionId } = require('../basilCompat');
/**
 * Handles the `invoice.created` event from Stripe.
 * Only handles WTMG subscription renewal invoices, ignores other invoices.
 *
 * @param {Stripe.InvoiceCreatedEvent} event
 * @param {EResponse} res
 *
 */
module.exports = async (event, res) => {
  logger.log('Handling invoice.created', {
    eventId: event.id
  });
  const invoice = event.data.object;

  // NOTE: we only look for subscription_cycle invoices here, whose line item carries the sub's recurring price
  const isWtmgSubscriptionInvoice = await isWTMGInvoice(invoice);
  if (!(isWtmgSubscriptionInvoice && invoice.billing_reason === 'subscription_cycle')) {
    // Ignore invoices that were created for events not related
    // to WTMG subscription renewals
    //
    // NOTE: a subscription creation (first invoice) will have billing_reason `subscription_create`
    logger.debug('Ignoring non-WTMG or non subscription-cycle invoice');
    return res.sendStatus(200);
  }

  const uid = await getFirebaseUserId(/** @type {string} */ (invoice.customer));

  // Finalize the invoice
  /** @type {Stripe.Invoice} */
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
  const subscriptionId = getInvoiceSubscriptionId(finalizedInvoice);
  if (!subscriptionId) {
    const msg = 'invoice.created event for a WTMG invoice without an attached subscription';
    logger.error(msg);
    res.status(500);
    return res.send(msg);
  }
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  if (subscription.collection_method === 'send_invoice') {
    logger.error(
      `A WTMG renewal invoice was created with send_invoice, this should not be possible anymore.`,
      { subscriptionId: subscription.id }
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
  const { privateUserProfileDocRef } = await getUserDocRefsWithData(uid);

  // Set the user's latest invoice state
  // + save the renewal invoice URL in Firebase
  await privateUserProfileDocRef.update(
    removeUndefined({
      [renewalInvoiceLinkKey]: finalizedInvoice.hosted_invoice_url,
      [latestInvoiceStatusKey]: finalizedInvoice.status
      // startDate should not have changed
    })
  );

  // No email is sent on renewal invoice creation
  //
  return res.sendStatus(200);
};

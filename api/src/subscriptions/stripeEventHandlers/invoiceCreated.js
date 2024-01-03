// @ts-check
const functions = require('firebase-functions');
const stripe = require('../stripe');
const getFirebaseUserId = require('../getFirebaseUserId');
const { stripeSubscriptionKeys } = require('../constants');
const removeUndefined = require('../../util/removeUndefined');
const { db } = require('../../firebase');
const { sendSubscriptionRenewalEmail } = require('../../mail');

/**
 * Handles the `invoice.created` event from Stripe.
 * Only handles WTMG subscription renewal invoices, ignores other invoices.
 *
 * @param {any} event
 * @param {import('firebase-functions/v1').Response} res
 *
 */
module.exports = async (event, res) => {
  console.log('Handling invoice.created');
  /** @type {import('stripe').Stripe.Invoice} */
  const invoice = event.data.object;

  const priceIdsObj = functions.config().stripe.price_ids;
  const wtmgPriceIds = Object.values(priceIdsObj);

  const price = invoice.lines.data[0]?.price;
  const isWtmgSubscriptionInvoice = wtmgPriceIds.includes(price?.id || '');
  if (invoice.billing_reason !== 'subscription_cycle' || !isWtmgSubscriptionInvoice) {
    // Ignore invoices that were created for events not related
    // to WTMG subscription renewals
    //
    // NOTE: a subscription creation (first invoice) will have billing_reason `subscription_create`
    return res.sendStatus(200);
  }

  const uid = await getFirebaseUserId(invoice.customer);

  // Finalize the invoice
  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

  const { renewalInvoiceLinkKey, latestInvoiceStatusKey } = stripeSubscriptionKeys;

  if (!finalizedInvoice.hosted_invoice_url) {
    const errorMsg = 'Could not correctly finalize the renewal invoice';
    console.error(errorMsg);
    res.status(500);
    return res.send(errorMsg);
  }

  //
  // Set the user's latest invoice state
  // + save the renewal invoice URL in Firebase
  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
  await privateUserProfileDocRef.update(
    removeUndefined({
      [renewalInvoiceLinkKey]: finalizedInvoice.hosted_invoice_url,
      [latestInvoiceStatusKey]: finalizedInvoice.status
      // startDate should not have changed
    })
  );

  // Get public & private data
  const publicUserProfileDocRef = db.doc(`users/${uid}`);
  const [publicUserProfileData, privateUserProfileData] = (
    await Promise.all([publicUserProfileDocRef.get(), privateUserProfileDocRef.get()])
  ).map((s) => s.data());

  if (
    !(
      publicUserProfileData &&
      privateUserProfileData &&
      finalizedInvoice.customer_email &&
      finalizedInvoice.hosted_invoice_url &&
      typeof price?.unit_amount === 'number'
    )
  ) {
    const errorMsg = 'Missing parameters to send a subscription renewal email';
    res.status(500);
    return res.send(errorMsg);
  }

  // Send renewal invoice email
  await sendSubscriptionRenewalEmail({
    email: finalizedInvoice.customer_email,
    firstName: publicUserProfileData.firstName,
    renewalLink: finalizedInvoice.hosted_invoice_url,
    price: price.unit_amount / 100,
    language: privateUserProfileData.communicationLanguage
  });

  return res.sendStatus(200);
};

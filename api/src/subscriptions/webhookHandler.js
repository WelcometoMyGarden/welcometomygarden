const { logger } = require('firebase-functions');
const { defineString } = require('firebase-functions/params');
const stripe = require('./stripe');
const fail = require('../util/fail');
const invoiceFinalized = require('./stripeEventHandlers/invoiceFinalized');
const invoicePaid = require('./stripeEventHandlers/invoicePaid');
const subscriptionUpdated = require('./stripeEventHandlers/subscriptionUpdated');
const subscriptionDeleted = require('./stripeEventHandlers/subscriptionDeleted');
const paymentIntentProcessing = require('./stripeEventHandlers/paymentIntentProcessing');
const paymentIntentPaymentFailed = require('./stripeEventHandlers/paymentIntentPaymentFailed');
const invoiceCreated = require('./stripeEventHandlers/invoiceCreated');
const { getStripeVersion } = require('../sharedConfig');
const subscriptionCreated = require('./stripeEventHandlers/subscriptionCreated');

const stripeWebhookSecretParam = defineString('STRIPE_WEBHOOK_SECRET');

// Imported in index
// https://firebase.google.com/docs/functions/http-events
/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
exports.stripeWebhookHandler = async (req, res) => {
  if (req.method !== 'POST') {
    fail('invalid-argument');
  }

  const acceptVersion = getStripeVersion();

  // Handle versioning according to https://docs.stripe.com/webhooks/versioning
  const eventVersion = req.query.version;

  if (eventVersion !== acceptVersion) {
    if (!acceptVersion) {
      logger.error('No Stripe accept version set, or it could not be parsed');
      fail('internal');
    }

    if (eventVersion != null) {
      // lexicographical sorting should work on ISO dates plus suffixes
      if (eventVersion > acceptVersion) {
        // The version sent is newer than the accepted version, ignore and return 200
        logger.log(`Skipping request with newer version ${eventVersion}, returning status 200`);
        return res.sendStatus(200);
      }
      if (eventVersion < acceptVersion) {
        // The version sent is older than the accepted version, ignore and return 400
        logger.log(`Skipping request with older version ${eventVersion}, returning status 400`);
        return res.sendStatus(400);
      }
    }

    // If no event version is set, or if the event version is exactly equal to the accepted version,
    // continue processing the event
  }

  // Decode the event
  let event = null;
  // https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements
  try {
    event = stripe.webhooks.constructEvent(
      // We had to change this from req.body to req.rawBody
      // https://github.com/stripe/stripe-node#webhook-signing
      // https://firebase.google.com/docs/functions/http-events#read_values_from_the_request
      req.rawBody,
      req.headers['stripe-signature'],
      stripeWebhookSecretParam.value()
    );
  } catch (err) {
    logger.log(err);
    logger.log(`⚠️  Webhook signature verification failed.`);
    logger.log(`⚠️  Check the env file and enter the correct webhook secret.`);
    return res.sendStatus(400);
  }

  // Handle the event
  // Review important events for Billing webhooks
  // https://stripe.com/docs/billing/webhooks
  // https://stripe.com/docs/billing/subscriptions/overview
  // Remove comment to see the various objects sent for this sample
  switch (event.type) {
    case 'invoice.finalized':
      return invoiceFinalized(event, res);
    case 'invoice.created':
      return invoiceCreated(event, res);
    case 'invoice.finalization_failed':
      // TODO ?
      break;
    case 'payment_intent.processing':
      return paymentIntentProcessing(event, res);
    case 'payment_intent.payment_failed':
      return paymentIntentPaymentFailed(event, res);
    case 'invoice.paid':
      return invoicePaid(event, res);
    case 'invoice.upcoming':
      // Sent a few days prior to the renewal of the subscription. The number of days is based on the number set for Upcoming renewal events in the Dashboard. You can still add extra invoice items, if needed.
      // TODO send reminder/announcement email?
      break;
    case 'invoice.payment_failed':
      // TODO: does this apply to send_invoice? Don't think so
      // If the payment fails or the customer does not have a valid payment method,
      //  an invoice.payment_failed event is sent, the subscription becomes past_due.
      // Use this webhook to notify your user that their payment has
      // failed and to retrieve new card details.
      // Don't forget to change the webhook event config too.
      // TODO: also handle marked_uncollectible?
      break;
    case 'customer.subscription.deleted':
      return subscriptionDeleted(event, res);
    case 'customer.subscription.created':
      return subscriptionCreated(event, res);
    case 'customer.subscription.updated':
      // Handle subscription change (tier etc)
      return subscriptionUpdated(event, res);
    default:
    // Unexpected event type
  }
  return res.sendStatus(200);
};

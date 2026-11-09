const { logger } = require('firebase-functions');
const { defineString } = require('firebase-functions/params');
const stripe = require('./stripe');
const fail = require('../util/fail');
const invoicePaid = require('./stripeEventHandlers/invoicePaid');
const subscriptionUpdated = require('./stripeEventHandlers/subscriptionUpdated');
const subscriptionDeleted = require('./stripeEventHandlers/subscriptionDeleted');
const paymentIntentProcessing = require('./stripeEventHandlers/paymentIntentProcessing');
const paymentIntentPaymentFailed = require('./stripeEventHandlers/paymentIntentPaymentFailed');
const invoiceCreated = require('./stripeEventHandlers/invoiceCreated');
const { getStripeVersion } = require('../sharedConfig');
const subscriptionCreated = require('./stripeEventHandlers/subscriptionCreated');
const invoiceUpcoming = require('./stripeEventHandlers/invoiceUpcoming');

const stripeWebhookSecretParam = defineString('STRIPE_WEBHOOK_SECRET');

// Imported in index
// https://firebase.google.com/docs/functions/http-events
/**
 *
 * @param {FV2.Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
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
        res.sendStatus(200);
        return;
      }
      if (eventVersion < acceptVersion) {
        // The version sent is older than the accepted version, ignore and return 400
        logger.log(`Skipping request with older version ${eventVersion}, returning status 400`);
        res.sendStatus(400);
        return;
      }
    }

    // If no event version is set, or if the event version is exactly equal to the accepted version,
    // continue processing the event
  }

  // Decode the event
  /** @type {Stripe.Event} */
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
    res.sendStatus(400);
    return;
  }

  // Handle the event
  // Review important events for Billing webhooks
  // https://stripe.com/docs/billing/webhooks
  // https://stripe.com/docs/billing/subscriptions/overview
  // Remove comment to see the various objects sent for this sample
  switch (event.type) {
    case 'invoice.created':
      await invoiceCreated(event, res);
      return;
    case 'payment_intent.processing':
      await paymentIntentProcessing(event, res);
      return;
    case 'payment_intent.payment_failed':
      await paymentIntentPaymentFailed(event, res);
      return;
    case 'invoice.paid':
      await invoicePaid(event, res);
      return;
    case 'invoice.upcoming':
      // Sent a few days prior to the renewal of the subscription.
      // The number of days is based on the number set for Upcoming renewal events in the Dashboard. You can still add extra invoice items, if needed.
      await invoiceUpcoming(event, res);
      return;
    case 'customer.subscription.deleted':
      await subscriptionDeleted(event, res);
      return;
    case 'customer.subscription.created':
      await subscriptionCreated(event, res);
      return;
    case 'customer.subscription.updated':
      // Handle subscription change (tier etc)
      await subscriptionUpdated(event, res);
      return;
    default:
      // Unexpected event type
      logger.warn(`Unexpected event type: ${event.type}`);
  }
  res.sendStatus(200);
  return;
};

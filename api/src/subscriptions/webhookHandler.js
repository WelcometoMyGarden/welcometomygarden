const functions = require('firebase-functions');
const stripe = require('./stripe');
const fail = require('../util/fail');
const invoiceFinalized = require('./stripeEventHandlers/invoiceFinalized.js');
const invoicePaid = require('./stripeEventHandlers/invoicePaid.js');
const subscriptionDeleted = require('./stripeEventHandlers/subscriptionDeleted.js');
const subscriptionUpdated = require('./stripeEventHandlers/subscriptionUpdated');

// Imported in index
// https://firebase.google.com/docs/functions/http-events
exports.stripeWebhookHandler = async (req, res) => {
  if (req.method !== 'POST') {
    fail('invalid-argument')
  }
  let event;

  // https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements
  try {
    event = stripe.webhooks.constructEvent(
      // We had to change this from req.body to req.rawBody
      // https://github.com/stripe/stripe-node#webhook-signing
      // https://firebase.google.com/docs/functions/http-events#read_values_from_the_request
      req.rawBody,
      req.headers['stripe-signature'],
      functions.config().stripe.webhook_secret
    );
  } catch (err) {
    console.log(err);
    console.log(`⚠️  Webhook signature verification failed.`);
    console.log(
      `⚠️  Check the env file and enter the correct webhook secret.`
    );
    return res.sendStatus(400);
  }


  // Handle the event
  // Review important events for Billing webhooks
  // https://stripe.com/docs/billing/webhooks
  // https://stripe.com/docs/billing/subscriptions/overview
  // Remove comment to see the various objects sent for this sample
  switch (event.type) {
    case 'invoice.created':
      // Probably we don't want to use this so much, but more the finalization
      if (event.request) {
        // When we created the invoice
        // (TODO TEST: the sub does?)
        console.log(event.request)
      }
      // "If Stripe fails to receive a successful response to invoice.created,
      // then finalizing all invoices with automatic collection is delayed for up to 72 hours."
      // https://stripe.com/docs/billing/subscriptions/overview#subscription-events
      return res.sendStatus(200)
    case 'invoice.finalized':
      return await invoiceFinalized(event, res);
    case 'invoice.finalization_failed':
      // TODO ?
      break;
    case 'invoice.paid':
      return await invoicePaid(event, res);
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
      break;
    case 'customer.subscription.deleted':
      return await subscriptionDeleted(event, res);
    case 'customer.subscription.updated':
      return await subscriptionUpdated(event, res);
      // handle subscription change (tier etc)
      break;
    default:
    // Unexpected event type
  }
  res.sendStatus(200);
}

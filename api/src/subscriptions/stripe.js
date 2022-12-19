const functions = require('firebase-functions');
const Stripe = require('stripe');
// This gives us autocompletion in VSCode
// https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html
/** @type {Stripe.Stripe} */
const stripe = new Stripe(
  functions.config().stripe.secret_key
  // TODO: setting an apiVersion messes with forwarding of events to the Stripe CLI
  // Read up later: https://stripe.com/docs/api/versioning
  // at least of the form stripe listen --load-from-webhooks-api --forward-to http://127.0.0.1:5001/wtmg-dev/europe-west1/stripeWebhooks
  // {
  //   // apiVersion: '2022-11-15'
  //   // 2022-08-01 is reported by the Stripe CLI - it's the one set in our Dashboard
  //   apiVersion: '2022-08-01'
  // }
);

module.exports = stripe;

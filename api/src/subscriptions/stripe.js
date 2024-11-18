const Stripe = require('stripe');
const { getStripeVersion } = require('../sharedConfig');

let stripeClient;

/**
 * This gives us autocompletion in VSCode
 * https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html
 * Proper Typescript usage seems to need ES modules https://github.com/stripe/stripe-node#usage-with-typescript
 * @type {Stripe.Stripe}
 */
module.exports = new Proxy(
  {},
  {
    get(_, prop) {
      if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
        // Lazily initialize the client, becuase Firebase pre-deploy code analysis for parameters executes code in the global scope,
        // but it doesn't pick up environment variables.
        // TODO: we can also apply this approach to supabase
        // @ts-ignore
        stripeClient = new Stripe(
          process.env.STRIPE_SECRET_KEY,
          // TODO: setting an apiVersion messes with forwarding of events to the Stripe CLI
          // at least of the form stripe listen --load-from-webhooks-api --forward-to http://127.0.0.1:5001/wtmg-dev/europe-west1/stripeWebhooks
          // See https://stripe.com/docs/api/versioning and https://docs.stripe.com/changelog/
          {
            apiVersion: getStripeVersion()
          }
        );
      }
      return stripeClient[prop];
    }
  }
);

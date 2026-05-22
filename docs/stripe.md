# Integrating with the Stripe development environment

## Testing the API integration

### Backend test config

Ensure the relevant testing Stripe API secret, webhook secret and product IDs are filled in your .env files.

Which ones you need depends on the Stripe environment you're targeting, and the Firebase Functions' environment you are running with (local, staging, production?).

- If you only run the local functions emulator against the deployed staging Firestore (the `wtmg-dev` project), Auth, and Stripe's Legacy Test Mode (our previous "staging testing approach"), then you will want to consider `./api/.env.staging` (also used for deployment) and `./api/.env.staging.local` (local overrides), and possibly temporarily rename `./api/.env.local` to prevent unwanted overrides.
  dd
- To run test locally against the local `demo-test` Firebase project, we use the new Stripe Sandbox named "Local". In this case, only `./api/.env.local` is relevant.

### Set up local webhooks

For more, see the Stripe guide to set up local Stripe webhook triggers: https://docs.stripe.com/webhooks#test-webhook
First, [install the CLI](https://stripe.com/docs/stripe-cli) & log in.

```bash
stripe login
```

Then, refer webhook events to your local function emulators.
**Note:** you need to run `stripe login` again to **switch the local listener to a different sandbox** (the CLI only supports one environment at a time).

**⚠️ In case of taking over events from deployed webhook listeners**

If another (live) testing webhook listener is already active (for example, in the deployed wtmg-dev environment), _disable_ those webhooks first in Stripe, to avoid having duplicate handler invocations for events. You can do this here: https://dashboard.stripe.com/test/webhooks (for the legacy test mode) or in the equivalent dashboard page for the sandbox you're targeting.

**Start the listeners**

Run:

```sh

# For demo-test
stripe listen --events customer.subscription.created,customer.subscription.deleted,customer.subscription.updated,invoice.finalized,invoice.created,invoice.paid,invoice.upcoming,payment_intent.processing,payment_intent.payment_failed --forward-to http://127.0.0.1:5001/demo-test/europe-west1/handleStripeWebhookV2

# For wtmg-dev / staging
stripe listen --events customer.subscription.created,customer.subscription.deleted,customer.subscription.updated,invoice.finalized,invoice.created,invoice.paid,invoice.upcoming,payment_intent.processing,payment_intent.payment_failed --forward-to http://127.0.0.1:5001/wtmg-dev/europe-west1/handleStripeWebhookV2
```

Make sure you forward events to the project name of the current Firebase project (`/wtmg-dev/` or `/demo-test`).

**Good to know**

- Also verify that the front-end can connect to the API emulator, with (`VITE_USE_API_EMULATOR=true`) in the frontend .env.
- **Re-triggering a specific event** may be helpful for debugging, it's possible using

  ```bash
  stripe events resend <event id>
  ```

  (see [here](https://github.com/stripe/stripe-cli/wiki/events-resend-command))

- If you get an `api-key-expired` error, you must likely log in again. The authentication expires after 90 days.

- NOTE: I've had weird behavior with `--load-from-webhooks-api`, with or without an extra `--events` key specified. Sometimes events got forwarded to the local server, and sometimes not propery (no responses were being logged). It might also depend on the staging endpoint being disabled or not. The above works dependably.

### Testing payment methods

For payment details to be used in testing, see the following: https://docs.stripe.com/testing?testing-method=tokens#use-test-cards

- Fake _card numbers_ can be used in interactive UIs (Stripe's client-side tools). Using them directly in server-side API is disabled by default for security. Test IBAN bank account numbers can be used server side (TODO: verify).
- Pre-made test payment methods like `pm_*` can be used in some contexts, like when creating a payment intent. I've verified it to _not_ work when creating a subscription.
- Tokens are the most versatile. Many payment methods (mostly cards) can be created with a token, by passing a `{token: 'tok_...'}` object to the specific payment method configuration when creating a payment method, e.g.
  ```js
  stripe.paymentMethods.create({
    type: 'card',
    card: { token: 'tok_visa_debit' }
  });
  ```

### Stripe config notes

- In https://dashboard.stripe.com/settings/billing/automatic, we switched "Email finalised invoices to customers" OFF (default: ON), so we can create our own copy for this email
- We changed the rules for overdue subscriptions and invoices.

## Stripe API/event version updates

Are documented here: https://docs.stripe.com/changelog

- The Stripe backend API client is pinned to a certain version by default, but we provide a specific API version in `api/src/subscriptions/stripe.js`, using `STRIPE_VERSION`.
- Webhooks **can be** pinned to a specific version, which we do. We include this version in the `version` query parameter.

To test new versions, use the local Sandbox, and change the local env `STRIPE_VERSION` parameter. It is defined in:

- `api/.env.(prod|staging|local)`
- `ci/env-templates/backend.env`
- For docs `api/.env.example`,
  Then, in the web UI, go to Developer Workbench -> Overview -> API Version -> Upgrade to change the default account API version. This one will be used for `stripe listen` runs. Alternatively, use the `-l` flag to get the latest API version. If no version query param is given (it is not in the defaul `stripe listen` test webhook examples above), then the event version is assumed to be the desired version.

After testing, deployment happens by:

1. Creating a 2nd webhook registration that starts sending events with the new version in parallel. These should be ignored by the current production handler.
2. Deploying the handler function update that adds support for the new handler. This one will now start ignoring old version events.
3. Removing the webhook registration with the old version.
4. For good measure, also update the default account version.

See https://docs.stripe.com/upgrades#how-can-i-upgrade-my-api and https://docs.stripe.com/webhooks/versioning for more context.

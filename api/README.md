This inner package houses the Firebase Cloud Functions of WTMG's Firebase backend.

## Install

Install the dependencies, if you haven't already while following the [main README](../api/):

```
yarn install
```

## Configure the Cloud Functions

If you have [full access](../docs/full-access.md), set it up.

See https://firebase.google.com/docs/functions/local-emulator#set_up_functions_configuration_optional

Run this inside the `api` functions dir:

```
firebase functions:config:get > .runtimeconfig.json

# If using Windows PowerShell, replace the above with:
# firebase functions:config:get | ac .runtimeconfig.json
```

Will output a JSON file similar to the following (see .runtimeconfig-example.json), which will be picked up by the emulators:

```

{
  "frontend": {
    "url": "https://staging.welcometomygarden.org"
  },
  "sendgrid": {
    "key": "<secret_sendgrid_key>"
    ...
  },
  "stripe": {
    "secret_key": "<secret_key>",
    "webhook_secret": "<secret_key>"
  },
}
```

You can replace "frontend" with the localhost URL where you are currently running whe WTMG Svelte client app, if you want.

### Start dev servers

```
yarn serve
```

See package.json for alternative commands, as well as the `firebase` command itself. More convenience methods are available in [the root `package.json`](../package.json).

The Firebase CLI acts upon the `/api` folder as part of a bigger project.

**Dev server troubleshooting**

Sometimes the dev servers don't quit properly, and remain handing. On a restart, they will complain that the port of a certain emulator is already taken.

On macOS/Linux, you can kill the process listening on that port with:

```
lsof -ti tcp:8080 | xargs kill

# Or, if we're desperate:
lsof -ti tcp:8080 | xargs kill -9
```

## Running the Stripe dev environment

The Stripe integration was set up with the core ideas from this guide: [https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements](https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements), however, we're using `collection_method: 'send_invoice'` when creating subscriptions instead, and not the default auto-charge method.

This changes the way that Stripe operates on subscriptions & invoices significantly, so the real code differs from the guide.

Documentation is detailed and extensive, but also scattered. These additional resource may help:

### Testing the integration

**Test config**

Ensure the testing private secret and webhook secret are filled in `./.runtimeconfig.json`, and that the frontend has access to the publishable test key.

**Set up local webhooks**

Refer to the Stripe guide to set up local Stripe webhook triggers: https://stripe.com/docs/webhooks/test
o.

After having [installed the CLI](https://stripe.com/docs/stripe-cli) & logged in, refer them to function emulators:

If another live testing webhook listener is already active, disable it first, to avoid having duplicate handlers for events:

(the HTTP endpoint will be printed when starting the firebase dev servers)

1. Disable the main live test endpoint of the (temporarily) at https://dashboard.stripe.com/test/webhooks
2. Take over its events locally by running:

   ```
   stripe listen --events customer.subscription.deleted,customer.subscription.updated,invoice.finalized,invoice.paid  --forward-to http://127.0.0.1:5001/wtmg-dev/europe-west1/stripeWebhooks
   ```

3. Verify that `/wtmg-dev/` in the URL above matches your current Firebase emulator project (did you run `firebase use wtmg-dev` before running Firebase emulators?).

NOTE: I've had weird behavior with `--load-from-webhooks-api`, with or without an extra `--events` key specified. Sometimes events got forwarded to the local server, and sometimes not propery (no responses were being logged). It might also depend on the staging endpoint beign disabled or not. The above works dependably.

**Testing payment methods**

See here for fake payment details: https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements&element=payment#test

**Stripe config notes**

- In https://dashboard.stripe.com/settings/billing/automatic, we switched "Email finalised invoices to customers" OFF (default: ON), so we can create our own copy for this email
- We changed the rules for overdue subscriptions and invoices.

## Deployment to Firebase

Use the correct environment:

```
firebase use wtmg-dev
```

### Set (upload) the environment variables

1. [Akwardly ensure, one-by-one](https://firebase.google.com/docs/functions/config-env#deploying_multiple_sets_of_environment_variables) that your target environment has all the needed files (we should probably migrate to the new parametrized config, or [hack around it another way](<](https://medium.com/@AllanHasegawa/setting-config-for-firebase-cloud-functions-with-json-136f455e7c69)>))

   ```
   # Check what is live now
   firebase functions:config:get

   # Make changes
   firebase functions:config:set stripe.secret_key="API KEY" stripe.webh
   ook_secret="SECRET"

   # Check if you did well
   firebase functions:config:get
   ```

2. ensure no stray `.env.*` files are around in the `/api` dir that might confuse Firebase.

Keep in mind that Stripe Webhook signing secrets are **unique to the webhook endpoint**. They will be different for local testing, staging and production environments.

### Deploy functions

This will deploy all functions:

```
firebase deploy --only functions
```

This will deploy specific functions, for example, all new Stripe-related functions:

```
firebase deploy --only functions:createStripeCustomer,functions:createOrRetrieveUnpaidSubscription,functions:createCustomerPortalSession,functions:stripeWebhooks
```

### Deploy Firestore rules

See [the docs](https://firebase.google.com/docs/rules/manage-deploy#deploy_your_updates).

```
firebase deploy --only firestore:rules
```

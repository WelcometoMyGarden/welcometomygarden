This inner package houses the Firebase Cloud Functions of WTMG's Firebase backend.

## Install

Install the dependencies, if you haven't already while following the [dev env README](../docs/dev-env.md):

```
yarn install
```

## Configure the Cloud Functions

If you have [full access](../docs/full-access.md), follow the configuration instructions there.

### Start dev servers

```
yarn serve
```

See package.json for alternative commands, as well as the `firebase` command itself. More convenience methods are available in [the root `package.json`](../package.json).

The Firebase CLI acts upon the `/api` folder as part of a bigger project.

**Image resizing after garden upload**

The `storage-resize-images` extension (see below) has limited functionality in emulator mode (demo-test), but it does seem to be functional enough for our purposes. Make sure that `IMG_BUCKET=demo-test.appspot.com` in `../extensions/storage-resize-images.env` when testing locally (and only then).

**Dev server troubleshooting**

Sometimes the dev servers don't quit properly, and remain handing. On a restart, they will complain that the port of a certain emulator is already taken.

On macOS/Linux, you can kill the process listening on that port with:

```
lsof -ti tcp:8080 | xargs kill

# Or, if we're desperate:
lsof -ti tcp:8080 | xargs kill -9
```

In the root, there is also a ./killemulators.sh script that will try to kill all Firebase-related processes.

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

First, [install the CLI](https://stripe.com/docs/stripe-cli) & log in.

```
stripe login
```

Then, refer webhook events to your local function emulators.

If another live testing webhook listener is already active, disable it first, to avoid having duplicate handlers for events:

(the HTTP endpoint will be printed when starting the firebase dev servers)

1. Disable the main live test endpoint of the (temporarily) at https://dashboard.stripe.com/test/webhooks
2. Take over its events locally by running:

   ```
   stripe listen --events customer.subscription.created,customer.subscription.deleted,customer.subscription.updated,invoice.finalized,invoice.created,invoice.paid,payment_intent.processing,payment_intent.payment_failed --forward-to http://127.0.0.1:5001/wtmg-dev/europe-west1/handleStripeWebhookV2
   ```

   In case you want to test an (event) API version update, also pass -l for the latest events.

3. Verify that `/wtmg-dev/` in the URL above matches your current Firebase emulator project (did you run `firebase use wtmg-dev` before running Firebase emulators? Or are you using `/demo-test/`?). Also verify that the API emulator is active, with .env (`VITE_USE_API_EMULATOR=true`);

If you get an api-key-expired error, you must likely log in again. The authentication expires after 90 days.

NOTE: I've had weird behavior with `--load-from-webhooks-api`, with or without an extra `--events` key specified. Sometimes events got forwarded to the local server, and sometimes not propery (no responses were being logged). It might also depend on the staging endpoint being disabled or not. The above works dependably.

Re-triggering a specific event may be helpful for debugging, it's possible using

```
stripe events resend <event id>
```

(see [here](https://github.com/stripe/stripe-cli/wiki/events-resend-command))

**Testing payment methods**

See here for fake payment details: https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements&element=payment#test

**Stripe config notes**

- In https://dashboard.stripe.com/settings/billing/automatic, we switched "Email finalised invoices to customers" OFF (default: ON), so we can create our own copy for this email
- We changed the rules for overdue subscriptions and invoices.

## Running tests

This project uses the [mocha](https://mochajs.org/) test runner, and [sinon](https://sinonjs.org/releases/v17/) for mocking/inspecting objects for tests.

Run tests from the `api` folder.

To run all tests:

```
echo "node_modules/.bin/mocha"  > runtests.sh && firebase --project demo-test emulators:exec --ui ./runtests.sh
```

This example runs tests in the group that includes the string `sendMessageFromEmail`:

```
echo "node_modules/.bin/mocha -f sendMessageFromEmail" > runtests.sh && firebase --project demo-test emulators:exec --only auth,firestore --ui ./runtests.sh
```

Or, when functions or Firestore triggers should also be tested:

```
echo "node_modules/.bin/mocha -w -f onCampsitesWrite" > runtests.sh && firebase --project demo-test emulators:exec --only auth,firestore,functions --ui ./runtests.sh
```

Some unit tests can be run without starting firebase emulators, because they don't have Firebase dependencies, or their dependencies (like `logger` in from `functions-framework`) work standalone.

```
node_modules/.bin/mocha -w -f 'inbound email parser'
```

Running all tests from a single file:

```
echo "node_modules/.bin/mocha test/renewalScheduler.test.js" > runtests.sh && firebase --project demo-test emulators:exec --only auth,firestore --ui ./runtests.sh
```

To prevent Firestore-triggered functions from running (and potentially slowly hitting SendGrid), this example adds `--only auth,firestore`. Remove this to run the functions anyway for more realistic side-effects.

### Testing SendGrid Inbound Parse

Inbound Parse endpoints are configured in our production SendGrid because they require an authenticated domain (we could look into having a separate authenticated separate domain for staging). `parse.staging.welcometomygarden.org` points to the staging parser function.

To test SendGrid's Inbound Parse logic _locally_ (which sends `multipart/form-data`), I have in the past run the `parseInboundEmail` HTTP function locally, and created an SSH tunnel to it via a VPS which was reachable on the internet. The Inbound Parse endpoint then needs to be temporarily configured in the SendGrid Dashboard.

To not have to repeat this procedure, but still test email parsing, [./test/parseInboundEmail.test.js](./test/parseInboundEmail.test.js) references some realistic saved HTML and plain text email content, along with realistic parsed multipart parameters. This content can be gathered by using "dumpInboundEmail" as the SendGrid endpoint.

## Deployment to Firebase

Use the correct environment:

```
firebase use wtmg-dev
```

### Set (upload) the environment variables

Environment variables from the `.env.staging` or `.env.prod` files will be uploaded depending on the target, and will override currently set variables.

The currently used variables can be viewed in the Google Cloud Console -> Cloud Run Functions dashboard.

Keep in mind that Stripe Webhook signing secrets are **unique to the webhook endpoint**. They will be different for local testing, staging and production environments.

### Deploy functions

This will deploy all functions:

```
firebase deploy --only functions
```

This will deploy specific functions, for example, all currently used Stripe-related functions:

```
firebase deploy --project prod --only \
functions:createStripeCustomerV2,\
functions:createOrRetrieveUnpaidSubscriptionV2,\
functions:handleRenewalsV2,\
functions:handleStripeWebhookV2,\
functions:propagateEmailChangeV2,\
functions:onAuthUserDelete
```

### Deploy extensions

At the moment, we use only one Firebase Extension: storage-resize-images.

It has already been installed and registered locally in `../firebase.json`. Its version can be updated (locally) using:

```
firebase --project staging ext:update storage-resize-images
```

Use `staging` or `prod` for the project when updating (not sure how relevant it is). This command does not immediately deploy. It might rewrite the `../extensions/storage-resize-images.env` configuration environment variables, check that these overwrites are not unexpected.

**Actual deploy of the new version**

**Before** deploying a new function, make sure the .env file is aligned with the target deploy environment. In particular, the `IMG_BUCKET` should point to the Firebase Storage bucket of the environment. AFAIK (untested), unlike general Firebase Functions, Extension .env files can not work with `.env.[environment-name]` files for overrides. The env values need to be manually switched before a deploy, because they will be uploaded to the resulting cloud functions that comprise the extension.

```
firebase --project staging ext:update storage-resize-images
```

### Deploy Firestore rules

See [the docs](https://firebase.google.com/docs/rules/manage-deploy#deploy_your_updates).

```
# For Firestore
firebase deploy --only firestore:rules

# For Storage
firebase deploy --only storage

# Both
firebase deploy --only firestore:rules,storage
```

Note: this uses firebase-admin version 9, that is a version before 10.

[Version 10 introduced a major architecture rewrite](https://firebase.google.com/docs/admin/migrate-node-v10).

## Get started

### Install

```
yarn install
```

### Set up Firebase

Install the [Firebase CLI](https://firebaseopensource.com/projects/firebase/firebase-tools/), if you don't have it already.

```
yarn global add firebase-tools
```

Then, set up the Firebase project.

```
# A. simple login. Will open a browser prompt
firebase login

# B. Use the following if you need to login using your WTMG Google Account address that has access to WTMG, but already have another active Firebase account elsewhere.

# Open web login prompt
firebase login:add
# Register this account with the current directory
firebase login:use <your_wtmg_email>

# Specify the project you want to target (wtmg-dev or wtmg-production)
firebase use wtmg-dev
```

### Configure the environment

See https://firebase.google.com/docs/functions/local-emulator#set_up_functions_configuration_optional

```
firebase functions:config:get > .runtimeconfig.json
```

Will output the following, which will be picked up by the emulators:

```

{
  "sendgrid": {
    "key": "<secret_sendgrid_key>"
  },
  "frontend": {
    "url": "https://staging.welcometomygarden.org"
  }
}
```

You can replace "frontend" with the localhost URL where you are currently running whe WTMG Svelte client app, if you want.

### Start dev servers

```
yarn serve
```

use `yarn debug` to launch an inspectable dev server.

See package.json for alternative commands, as well as the `firebase` command itself.

## Stripe

The Stripe integration was set up with the core ideas from this guide: [https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements](https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements), however, we're using `collection_method: 'send_invoice'` when creating subscriptions instead, and not the default auto-charge method.

This changes the way that Stripe operates on subscriptions & invoices significantly, so the real code differs from the guide.

Documentation is detailed and extensive, but also scattered. These additional resource may help:

### Testing the integration

#### Test config

Ensure the testing private secret and webhook secret are filled in `./.runtimeconfig.json`, and that the frontend has access to the publishable test key.

#### Set up local webhooks

Refer to the Stripe guide to set up local Stripe webhook triggers: https://stripe.com/docs/webhooks/test
o.

After having installed the CLI & logged in, refer them to function emulators:

```
stripe listen --forward-to http://127.0.0.1:5001/wtmg-dev/us-central1/stripeWebhooks
```
(the HTTP endpoint will be printed when starting the firebase dev servers)

#### Testing payment methods

See here for fake payment details: https://stripe.com/docs/billing/subscriptions/build-subscriptions?ui=elements&element=payment#test

### Stripe config

- In https://dashboard.stripe.com/settings/billing/automatic, we switched "Email finalised invoices to customers" OFF (default: ON), so we can create our own copy for this email
- We changed the rules for overdue subscriptions and invoices.

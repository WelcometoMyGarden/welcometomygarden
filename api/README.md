This subproject houses the Firebase Cloud Functions of WTMG's Firebase backend.

## Install

Install the dependencies, if you haven't already while following the [dev env README](../docs/dev-env.md):

```sh
yarn install
```

## Configure the Cloud Functions

If you have [full access](../docs/full-access.md), follow the configuration instructions there.

### Start dev servers

```sh
yarn serve
```

See package.json for alternative commands, as well as the `firebase` command itself. More convenience methods are available in [the root `package.json`](../package.json).

The Firebase CLI acts upon the `/api` folder as part of a bigger project.

**Image resizing after garden upload**

The `storage-resize-images` extension (see below) has limited functionality in emulator mode (demo-test), but it does seem to be functional enough for our purposes. Make sure that `IMG_BUCKET=demo-test.appspot.com` in `../extensions/storage-resize-images.env` when testing locally (and only then).

**Dev server troubleshooting**

Sometimes the Firebase emulators don't quit properly, and cause "port already in use" issues when you try to start them again.

In the root, there is `./killemulators.sh` script that will try to kill all Firebase-related processes.

## Running tests

This project uses the [mocha](https://mochajs.org/) test runner, and [sinon](https://sinonjs.org/releases/v17/) for mocking/inspecting objects for tests.

Most tests depend on (parts of) a Firebase Emulator environment, therefore it is convenient to first start a Firebase emulator dev environment independently in a shell, for example with `yarn firebase:demo`. This is useful to develop tests, since the same emulator environment can be preserved while changing application and test code, and no lengthy emulator restarts are required.

Tests can then be run in another shell using `mocha`. You will need to prepare the mocha shell environment to connect to the local emulators, for example with:

```sh
cd api
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

Here are some test examples:

```sh
# Run all tests
mocha

# To run all the tests from a single file
mocha test/renewalScheduler.test.js

# Runs tests from the describe() or it() groups that include `onCampsitesWrite`.
# Use `-w` to watch the tests = re-run on file changes.
mocha -w -f onCampsitesWrite
```

Alternatively, you can use the recommended "Mocha Test Explorer" VSCode extension to run tests. The above env variables are already set up there via `settings.json`.

**Good to know**

- Disable features you don't need to test in the demo project `.env.local`. For example, SendGrid and Supabase sync are not required and slow down the emulator's operations.
- `sendInvoice.test.js` and `chargeAutomatically.test.js` only make sense with a Stripe sandbox connected to the local emulator, and are `.skip()`ped by default.

**Starting only selected emulators**

Some tests don't depend on the entire suite of emulators. It is possible to only start a subset. Some examples:

- `mocha -w -f 'inbound email parser'` works completely without emulators, since `logger` in from `functions-framework` works standalone too.
- `mocha -f sendMessageFromEmail` only needs `auth` & `firestore`, functions/firestore triggers are not required.

It is however safest to start all emulators if you're not sure.

**Emulator calling the tests**

Tests can be run in a single command by using `emulators:exec` to let Firebase Emulators call/fork the tests against its environment. In this case, the emulator exports the right emulator env variables (see above). This requires an ad-hoc script file to be created which `emulators:exec` can execute. An example:

```sh
echo "node_modules/.bin/mocha" > runtests.sh && chmod u+x runtests.sh &&\
firebase --project demo-test emulators:exec --ui ./runtests.sh
```

### Testing SendGrid Inbound Parse

Inbound Parse endpoints are configured in our production SendGrid because they require an authenticated domain (we could look into having a separate authenticated separate domain for staging). `parse.staging.welcometomygarden.org` points to the staging parser function.

To test SendGrid's Inbound Parse logic _locally_ (which sends `multipart/form-data`), I have in the past run the `parseInboundEmail` HTTP function locally, and created an SSH tunnel to it via a VPS which was reachable on the internet. The Inbound Parse endpoint then needs to be temporarily configured in the SendGrid Dashboard.

To not have to repeat this procedure, but still test email parsing, [./test/parseInboundEmail.test.js](./test/parseInboundEmail.test.js) references some realistic saved HTML and plain text email content, along with realistic parsed multipart parameters. This content can be gathered by using "dumpInboundEmail" as the SendGrid endpoint.

## Deployment to Firebase

Use the correct environment:

```sh
firebase use wtmg-dev
```

### Set (upload) the environment variables

Environment variables from the `.env.staging` or `.env.prod` files will be uploaded depending on the target, and will override currently set variables.

The currently used variables can be viewed in the Google Cloud Console -> Cloud Run Functions dashboard.

Keep in mind that Stripe Webhook signing secrets are **unique to the webhook endpoint**. They will be different for local testing, staging and production environments.

### Deploy functions

**Selective production deploy (most common)**

This will deploy specific functions, for example, all currently used Stripe-related functions:

```sh
firebase deploy --project prod --only \
functions:createStripeCustomerV2,\
functions:createOrRetrieveUnpaidSubscriptionV2,\
functions:handleRenewalsV2,\
functions:handleStripeWebhookV2,\
functions:propagateEmailChangeV2,\
functions:onAuthUserDelete
```

**Full production deploy**

This will deploy **ALL** functions **in production**:

```sh
firebase deploy --project prod --only functions
```

⚠️ Only do this when necessary, i.e. there is an Node engine update that affects all functions. Make sure all functions were tested on their latest versions, and verify/manually test whether the prod-only functions (see below) still work.

**Don't** do this in staging, since you'll deploy irrelevant functions there.

**Full staging deploy**

In staging (wtmg-dev), not all functions are relevant. These are relevant functions (sorted alphabetically, v1 functions on the bottom):

```sh
firebase deploy --project staging --only \
functions:checkContactCreation,\
functions:createCustomerPortalSessionV2,\
functions:createOrRetrieveUnpaidSubscriptionV2,\
functions:createStripeCustomerV2,\
functions:createUserV2,\
functions:discourseConnectLoginV2,\
functions:handleStripeWebhookV2,\
functions:onCampsiteCreateV2,\
functions:onCampsiteDeleteV2,\
functions:onCampsiteWriteV2,\
functions:onChatCreateV2,\
functions:onMessageCreateV2,\
functions:onUserPrivateWriteV2,\
functions:onUserWriteV2,\
functions:parseInboundEmailV2,\
functions:propagateEmailChangeV2,\
functions:requestEmailChangeV2,\
functions:requestPasswordResetV2,\
functions:resendAccountVerificationV2,\
functions:sendMessage,\
functions:updateEmail,\
functions:onAuthUserCreate,\
functions:onAuthUserDelete
```

These are the functions omitted from staging:

```sh
- backupFirestore # we don't need staging data backups
- handleRenewals # to test schedule renewal handling, local api tests with backdated (simulated) data is more helpful than waiting 1 year on events
- errorLogTunnel # this just proxies into our single Glitchtip instance, we use prod the prod function
- handleUnsubscribe # this is dependent on our production SendGrid
- functions depending on Supabase:
  - refreshAuthTableV2 # we currently don't have a staging Supabase
  - onChatWriteV2
  - onMessageWriteV2
```

### Deploy extensions

At the moment, we use only one Firebase Extension: storage-resize-images.

It has already been installed and registered locally in `../firebase.json`. Its version can be updated (locally) using:

```sh
firebase --project staging ext:update storage-resize-images
```

Use `staging` or `prod` for the project when updating (not sure how relevant it is). This command does not immediately deploy. It will rewrite the [`../extensions/storage-resize-images.env`](../extensions/storage-resize-images.env) configuration environment variables (delete comments and such), check that these overwrites/changes are not unexpected (this .env file is indexed in git). For notes related to our configuration, see [the extension readme](../extensions/readme.md).

**Actual deploy of the new version**

**Before** deploying a new function, make sure the [.env file](../extensions/storage-resize-images.env) is aligned with the target deploy environment. In particular, the `IMG_BUCKET` should point to the Firebase Storage bucket of the environment. For possible values, see [our extension readme](../extensions/readme.md).

AFAIK (untested), unlike general Firebase Functions, Extension .env files can not work with `.env.[environment-name]` files for overrides. The env values need to be manually switched before a deploy, because they will be uploaded to the resulting cloud functions that comprise the extension.

Afterwards (fill in the right project):

```sh
firebase --project staging deploy --only extensions
```

I don't think it's possible (yet) to only deploy one extension, which is OK since at the moment we only have one extension active.

### Deploy Firestore rules

See [the docs](https://firebase.google.com/docs/rules/manage-deploy#deploy_your_updates).

```sh
# For Firestore
firebase deploy --only firestore:rules

# For Storage
firebase deploy --only storage

# Both
firebase deploy --only firestore:rules,storage
```

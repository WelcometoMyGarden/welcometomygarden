// Integration tests for a charge_automatically subscription, between the Firebase backend & Stripe.
//
// This tests the logic of the Stripe event handlers for a charge_automatically renewal to some extent.
//
// It sets up the test by creating test users & customers, and roughly replicates
// the behavior of createOrRetrieveUnpaidSubscription function
// (note: some work could be done to extract the inner logic of that function so it is easily
// callable from tests without a frontend invocation)
//
// This test should be run with:
// - all Firebase emulators running
// - a Stripe sandbox, with the Stripe CLI forwarding events to the local dev env
// - mailpit (for email assertions)
//
// It can then be run from the /api folder by adding an .only to one of the .it()s here,
// and removing the global .skip() on the describe with `mocha test/chargeAutomatically.test.js`
//
// Running the frontend is optional, and might be useful
// For full front-end testing, refer to e2e tests.

const assert = require('node:assert');
const dotenv = require('dotenv');
const { resolve } = require('node:path');
// TODO: this might still be needed to import vars for stripe
// it should not be needed anymore for seeders/app
dotenv.config({ path: resolve(__dirname, '../.env.local'), quiet: true });
if (!process.env.STAGING) {
  dotenv.config({ path: resolve(__dirname, '../.env.test.local'), quiet: true });
}

const {
  clearAuth,
  clearFirestore,
  hasExactlyOneEmailWithQuery,
  clearEmails,
  getEmails,
  clearEmailsByQuery,
  getEmailTemplateData
} = require('./util/util');
const stripe = require('../src/subscriptions/stripe');

// Handlers we will call directly to avoid relying on webhook forwarding in CI
const { DateTime } = require('luxon');
const { setTimeout } = require('node:timers/promises');
const {
  createAndLinkTestClockCustomer,
  linkSubscription,
  pollForTestClockReady,
  authorizeTestRedirect,
  pollUntil
} = require('./util/stripe');
const {
  createOrRetrieveUnpaidSubscription
} = require('../src/subscriptions/createOrRetrieveUnpaidSubscription');
const { getInvoicePaymentIntent } = require('../src/subscriptions/basilCompat');
const { db } = require('../seeders/app');
const envIsTrue = require('../src/util/envIsTrue');

const MAIL_CONFIRMATION = 'subscriptionConfirmationEmail';
const MAIL_UPCOMING = 'subscriptionUpcomingRenewalEmail';
const MAIL_THANK_YOU_AUTOMATIC = 'subscriptionRenewalAutomaticThankYouEmail';
const MAIL_ALL_PAYMENTS_FAILED = 'subscriptionEndedPaymentsFailedEmail';

describe('charge_automatically', () => {
  //
  // Allow long-running Stripe operations
  beforeEach(async () => {
    await clearAuth();
    await clearFirestore();
    // Clear emails we might have lingering from other tests
    await clearEmails();
  });

  it('Happy path with payment card: charges first invoice, sends confirmation, sends upcoming renewal email, re-charges payment method, and sends thank you email', async () => {
    let { user, customer, usersPrivateRef, testClock } = await createAndLinkTestClockCustomer();

    // Create and attach a card payment method that will succeed in test mode
    console.log('Creating subscription...');
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa_debit' }
    });
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });

    // Create a subscription
    const priceId = process.env.STRIPE_PRICE_IDS_REDUCED;
    // This by default finalizes the first invoice
    const subscription = await stripe.subscriptions.create({
      billing_mode: { type: 'classic' },
      customer: customer.id,
      items: [{ price: priceId }],
      // FYI: this does not work, it presumably only works when creating paymentIntents
      // default_payment_method: 'pm_card_visa_debit',
      // We need to use the above token workflow
      default_payment_method: paymentMethod.id,
      expand: ['latest_invoice']
    });

    await linkSubscription(usersPrivateRef, subscription);

    // --> Calls the invoice.paid handler

    // Check Mailpit for subscription confirmation
    await hasExactlyOneEmailWithQuery(MAIL_CONFIRMATION);

    console.log('Advancing to just before the next year...');
    // Advance the test clock
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.items.data[0].current_period_end)
        .minus({ days: 4 })
        .toSeconds()
    });

    testClock = await pollForTestClockReady(testClock);

    // Check for the upcoming renewal email
    await hasExactlyOneEmailWithQuery(MAIL_UPCOMING);

    console.log('Advancing to 1 day after the renewal period');
    // Advance the test clock
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.items.data[0].current_period_end)
        .plus({ days: 1 })
        .toSeconds()
    });
    await pollForTestClockReady(testClock);

    // Check for the thank you email
    await hasExactlyOneEmailWithQuery(MAIL_THANK_YOU_AUTOMATIC);

    // Remove potential irrelevant email that pollutes the inbox
    await clearEmailsByQuery('abandonedCartReminderEmail');
    // Check that no other emails got sent
    if (!envIsTrue(process.env.SKIP_EMAIL_CHECK)) {
      assert((await getEmails()).length === 3, 'total number of emails is unexpected');
    }

    // Wait for handlers to finish after email
    await setTimeout(2000);

    // Check that the user is a superfan
    assert(
      (await db.collection('users').doc(user.uid).get()).data().superfan === true,
      'superfan was not true after renewal'
    );
  }).timeout(0);

  it('Happy path with SEPA: pays a first send_invoice invoice with Bancontact, converts to a generated SEPA Debit mandate, sends upcoming renewal email with mandate details, re-charges via SEPA, and sends thank you email', async () => {
    let { user, customer, usersPrivateRef, testClock } = await createAndLinkTestClockCustomer();

    // Create a send_invoice subscription, like the frontend does
    console.log('Creating subscription...');
    const priceId = /** @type {string} */ (process.env.STRIPE_PRICE_IDS_REDUCED);
    const { subscriptionId, clientSecret } = await createOrRetrieveUnpaidSubscription(
      /** @type {FV2.CallableRequest<{priceId: string, locale: string}>} */ (
        /** @type {unknown} */ ({
          auth: { uid: user.uid },
          data: { priceId, locale: 'en' }
        })
      )
    );
    const paymentIntentId = /** @type {string} */ (clientSecret).split('_secret_')[0];

    // Pay the first invoice with Bancontact, like the Payment Element would
    await authorizeTestRedirect(
      await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method_data: {
          type: 'bancontact',
          billing_details: { name: `${customer.name} Test`, email: customer.email }
        },
        mandate_data: {
          customer_acceptance: {
            type: 'online',
            online: { ip_address: '127.0.0.1', user_agent: 'mocha' }
          }
        },
        return_url: 'https://example.com/return'
      })
    );

    // The Bancontact charge generated a reusable SEPA Debit payment method and mandate
    const charge = await pollUntil(async () => {
      const { latest_charge, status } = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ['latest_charge']
      });
      return status === 'succeeded' && /** @type {Stripe.Charge} */ (latest_charge);
    });
    const { generated_sepa_debit, generated_sepa_debit_mandate, iban_last4 } =
      charge.payment_method_details.bancontact;
    assert.match(/** @type {string} */ (generated_sepa_debit), /^pm_\w+$/);
    assert.match(/** @type {string} */ (generated_sepa_debit_mandate), /^mandate_\w+$/);
    assert.match(/** @type {string} */ (iban_last4), /^\d{4}$/);
    const mandate = await stripe.mandates.retrieve(
      /** @type {string} */ (generated_sepa_debit_mandate)
    );
    assert.strictEqual(mandate.type, 'multi_use');
    assert.strictEqual(mandate.status, 'active');
    assert.match(mandate.payment_method_details.sepa_debit.reference, /^[\w-]+$/);

    // --> Calls the invoice.paid handler

    // Check Mailpit for subscription confirmation
    await hasExactlyOneEmailWithQuery(MAIL_CONFIRMATION);

    // --> invoice.paid also switches the subscription to charge_automatically with the generated SEPA Debit pm
    await pollUntil(
      async () =>
        (await usersPrivateRef.get()).data().stripeSubscription.collectionMethod ===
        'charge_automatically'
    );
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    assert.strictEqual(subscription.collection_method, 'charge_automatically');
    assert.strictEqual(subscription.default_payment_method, generated_sepa_debit);

    console.log('Advancing to just before the next year...');
    // Advance the test clock
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.items.data[0].current_period_end)
        .minus({ days: 4 })
        .toSeconds()
    });

    testClock = await pollForTestClockReady(testClock);

    // Check for the upcoming renewal email, which should describe the SEPA mandate
    await hasExactlyOneEmailWithQuery(MAIL_UPCOMING);
    if (!envIsTrue(process.env.SKIP_EMAIL_CHECK)) {
      const templateData = await getEmailTemplateData(MAIL_UPCOMING);
      const { secret } = (await usersPrivateRef.get()).data();
      const price = await stripe.prices.retrieve(priceId);
      assert.strictEqual(templateData.isSEPA, true);
      assert.strictEqual(templateData.last4, iban_last4);
      assert.strictEqual(
        templateData.mandateReference,
        mandate.payment_method_details.sepa_debit.reference
      );
      assert.strictEqual(templateData.price, price.unit_amount / 100);
      assert.strictEqual(templateData.email, customer.email);
      assert.strictEqual(templateData.secret, secret);
    }

    console.log('Advancing to 1 day after the renewal period');
    // Advance the test clock
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.items.data[0].current_period_end)
        .plus({ days: 1 })
        .toSeconds()
    });
    testClock = await pollForTestClockReady(testClock);

    // The renewal is charged with the generated SEPA Debit payment method
    // (SEPA settles asynchronously)
    const renewalInvoice = await pollUntil(
      async () =>
        (await stripe.invoices.list({ subscription: subscriptionId })).data.find(
          (invoice) => invoice.billing_reason === 'subscription_cycle' && invoice.status === 'paid'
        ),
      testClock
    );
    const renewalPaymentIntent = await getInvoicePaymentIntent(renewalInvoice.id);
    assert.strictEqual(renewalPaymentIntent?.payment_method, generated_sepa_debit);

    // Check for the thank you email
    // (sent on payment_intent.processing for SEPA, and not again on invoice.paid)
    await hasExactlyOneEmailWithQuery(MAIL_THANK_YOU_AUTOMATIC);

    // Remove potential irrelevant email that pollutes the inbox
    await clearEmailsByQuery('abandonedCartReminderEmail');
    // Check that no other emails got sent
    if (!envIsTrue(process.env.SKIP_EMAIL_CHECK)) {
      assert((await getEmails()).length === 3, 'total number of emails is unexpected');
    }

    // Wait for handlers to finish after email
    await setTimeout(2000);

    // Check that the user is a superfan
    assert(
      (await db.collection('users').doc(user.uid).get()).data().superfan === true,
      'superfan was not true after SEPA renewal'
    );
  }).timeout(0);

  it('Sad path with payment card and expiry: charges first invoice, sends confirmation, sends upcoming renewal email, sends "all payments failed" email if payment method is invalid', async () => {
    let { user, customer, usersPrivateRef, testClock } = await createAndLinkTestClockCustomer('fr');

    // Create and attach a card payment method that will succeed in test mode
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa_debit' }
    });
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
    //
    // Create a subscription
    const priceId = process.env.STRIPE_PRICE_IDS_REDUCED;
    // This by default finalizes the first invoice
    const subscription = await stripe.subscriptions.create({
      billing_mode: { type: 'classic' },
      customer: customer.id,
      items: [{ price: priceId }],
      default_payment_method: paymentMethod.id,
      expand: ['latest_invoice']
    });

    await linkSubscription(usersPrivateRef, subscription);

    // --> Calls the invoice.paid handler

    // Check Mailpit for subscription confirmation
    await hasExactlyOneEmailWithQuery(MAIL_CONFIRMATION);

    // Update the payment method to an invalid one, that can attach to a customer,
    // but will fail on the first charge
    const newPaymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa_chargeCustomerFail' }
    });
    await stripe.paymentMethods.attach(newPaymentMethod.id, { customer: customer.id });
    await stripe.subscriptions.update(subscription.id, {
      default_payment_method: newPaymentMethod.id
    });
    // Detach the old payment method
    await stripe.paymentMethods.detach(paymentMethod.id);

    // Advance the test clock
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.items.data[0].current_period_end)
        .minus({ days: 4 })
        .toSeconds()
    });

    testClock = await pollForTestClockReady(testClock);

    // Check for the upcoming renewal email
    await hasExactlyOneEmailWithQuery(MAIL_UPCOMING);

    console.log('Advancing test clock, trying to charge for renewal...');
    const oneDayAfterRenewalPoint = DateTime.fromSeconds(
      subscription.items.data[0].current_period_end
    ).plus({
      days: 1
    });
    // Advance the test clock
    // --> Stripe will attempt to charge the card, which should fail 2 more times
    //     (depends on dashboard settings)
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: oneDayAfterRenewalPoint.toSeconds()
    });
    testClock = await pollForTestClockReady(testClock);

    // MANUAL optional check of the account state after a single failed renewal

    console.log('Advancing test clock, trying to charge for renewal...');

    // Advance the test clock
    // --> Stripe should attempt to charge the card 2 more times, both failing
    //     (depends on dashboard settings)
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: oneDayAfterRenewalPoint.plus({ days: 7 }).toSeconds()
    });
    await pollForTestClockReady(testClock);

    // Check for the all payments failed email
    await hasExactlyOneEmailWithQuery(MAIL_ALL_PAYMENTS_FAILED);

    // Remove potential irrelevant email that pollutes the inbox
    await clearEmailsByQuery('abandonedCartReminderEmail');
    // Check that no other emails got sent
    assert((await getEmails()).length === 3, 'total number of emails is unexpected');

    // Wait for handlers to finish after email
    await setTimeout(3000);

    // Check that the user is a superfan
    assert(
      (await db.collection('users').doc(user.uid).get()).data().superfan === false,
      'superfan was not false after failed renewal'
    );
  }).timeout(0);

  it('Happy-ish path with payment card and recovery after first failed payment', async () => {
    let { user, customer, usersPrivateRef, testClock } = await createAndLinkTestClockCustomer();

    // Create and attach a card payment method that will succeed in test mode
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa_debit' }
    });
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
    //
    // Create a subscription
    const priceId = process.env.STRIPE_PRICE_IDS_REDUCED;
    // This by default finalizes the first invoice
    const subscription = await stripe.subscriptions.create({
      billing_mode: { type: 'classic' },
      customer: customer.id,
      items: [{ price: priceId }],
      default_payment_method: paymentMethod.id,
      expand: ['latest_invoice']
    });

    await linkSubscription(usersPrivateRef, subscription);

    // --> Calls the invoice.paid handler

    // Check Mailpit for subscription confirmation
    await hasExactlyOneEmailWithQuery(MAIL_CONFIRMATION);
    await setTimeout(2000);

    // Update the payment method to an invalid one, that can attach to a customer,
    // but will fail on the first charge
    const failAfterChargePaymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa_chargeCustomerFail' }
    });
    await stripe.paymentMethods.attach(failAfterChargePaymentMethod.id, { customer: customer.id });
    await stripe.subscriptions.update(subscription.id, {
      default_payment_method: failAfterChargePaymentMethod.id
    });
    // Detach the old payment method
    await stripe.paymentMethods.detach(paymentMethod.id);

    // Advance the test clock
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.items.data[0].current_period_end)
        .minus({ days: 4 })
        .toSeconds()
    });

    testClock = await pollForTestClockReady(testClock);

    // Check for the upcoming renewal email
    await hasExactlyOneEmailWithQuery(MAIL_UPCOMING);

    console.log('Advancing test clock, trying to charge for renewal...');
    // Advance the test clock
    // --> Stripe will attempt to charge the card, which will fail 1 time
    //     (depends on dashboard settings)
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.items.data[0].current_period_end)
        .plus({ days: 1 })
        .toSeconds()
    });
    testClock = await pollForTestClockReady(testClock);

    // --> Stripe should send a payment failed email now

    // Change card back to a good one
    // Create and attach a card payment method that will succeed in test mode
    const recoveryPaymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa_debit' }
    });
    await stripe.paymentMethods.attach(recoveryPaymentMethod.id, { customer: customer.id });
    await stripe.subscriptions.update(subscription.id, {
      default_payment_method: recoveryPaymentMethod.id
    });
    await stripe.paymentMethods.detach(failAfterChargePaymentMethod.id);

    console.log('Advancing test clock, trying to charge for renewal again...');
    // Advance the test clock
    // --> Stripe will attempt to charge the card again, which should succeed
    //     (depends on dashboard settings)
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.items.data[0].current_period_end)
        .plus({ days: 4 })
        .toSeconds()
    });
    await pollForTestClockReady(testClock);

    // Check for the renewal success payment email
    await hasExactlyOneEmailWithQuery(MAIL_THANK_YOU_AUTOMATIC);

    // Remove potential irrelevant email that pollutes the inbox
    await clearEmailsByQuery('abandonedCartReminderEmail');
    // Check that no other emails got sent
    assert((await getEmails()).length === 3, 'total number of emails is unexpected');

    // Wait for handlers to finish after email
    await setTimeout(3000);

    // Check that the user is a superfan
    assert.strictEqual(
      (await db.collection('users').doc(user.uid).get()).data().superfan,
      true,
      'superfan was not true after recovered good renewal'
    );
  }).timeout(0);

  it('Sad path with SEPA: charges first invoice, sends confirmation, sends upcoming renewal email, sends "all payments failed" email if payment method is invalid', async () => {
    let { user, customer, usersPrivateRef, testClock } = await createAndLinkTestClockCustomer();

    //
    // Create a subscription
    const priceId = process.env.STRIPE_PRICE_IDS_REDUCED;
    // This by default finalizes the first invoice
    const subscription = await stripe.subscriptions.create({
      billing_mode: { type: 'classic' },
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      // instead of default_payment_method, aligns more closely with createOrRetrieveUnpaidSubscription
      // and is possibly required too for a sepa debit renewal
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice']
    });

    // Create and attach a card payment method that will succeed in test mode
    //
    // NOTE: this does not fully align with production behavior, where createOrRetrieveUnpaidSubscription/invoicePaid
    // converts a paid bancontact/iDEAL payment into a SEPA debit pm
    // However, bancontact/iDEAL are at the moment not confirmable by test code (an e2e test could be used)
    //
    // NOTE 2: specific setup is needed here
    //
    // - If you don't use an explicit .confirm(), nothing happens (no sepa debit payment is made)
    // - If you use an explicit .confirm() on a sub with sepa debit default payment method, then:
    //   -> Error: This PaymentIntent requires a mandate, but no existing mandate was found. Collect mandate acceptance from the customer and try again, providing acceptance data in the mandate_data parameter.
    // - If you use an explicit .confirm() on an updated subscription payment intent, that was updated with setup_future_usage, without `mandate_data`
    //   -> Error: When confirming a PaymentIntent with a `sepa_debit` PaymentMethod and `setup_future_usage` value of off_session, `mandate_data` is required.

    const paymentMethod = await stripe.paymentMethods.create({
      type: 'sepa_debit',
      sepa_debit: {
        // https://docs.stripe.com/testing?testing-method=payment-methods&payment-method=sepa-direct-debit#non-card-payments
        // This will succeed
        iban: 'BE62510007547061'
      },
      billing_details: {
        name: customer.name,
        email: customer.email
      }
    });

    const existingPaymentIntent = await getInvoicePaymentIntent(
      /** @type {Stripe.Invoice} */ (subscription.latest_invoice)
    );
    const paymentIntent = await stripe.paymentIntents.update(existingPaymentIntent.id, {
      setup_future_usage: 'off_session',
      payment_method: paymentMethod.id
    });

    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });

    await linkSubscription(usersPrivateRef, subscription);

    // note: this requires mandate accepting...
    await stripe.paymentIntents.confirm(paymentIntent.id, {
      mandate_data: {
        customer_acceptance: {
          accepted_at: DateTime.now().toUnixInteger(),
          type: 'offline'
        }
      }
    });

    // --> Calls the invoice.paid handler

    // Check Mailpit for subscription confirmation
    await hasExactlyOneEmailWithQuery(MAIL_CONFIRMATION);

    // Special SEPA intervention: advance the test clock to 14 days after the sub start
    // we send the "confirmed" email on sepa payment_intent processing event, but
    // the invoice.paid event is still called after some time
    // If we don't wait here, then the invoice.paid of the first invoice
    // might reach our server AFTER the second invoice payment fails
    // (resetting the superfan status to true)
    console.log('Waiting 30 sec for SEPA invoice.paid to trigger asynchronously...');
    await setTimeout(30000);
    console.log('OK done');

    // TODO: how to test/confirm this?? Test manually?
    //
    // Update the payment method to an invalid one, that can attach to a customer,
    // NOTE/TODO: this is not exactly like the specific "accept attach, fail on first charge"
    // I can't find the specific renewal failure with this (renewal paymentintent's last status is "requires_confirmation")
    // it might just be that this misses the confirmation step from the above... because no mandate is attached?
    // I hope this automatically is done when a SEPA payment method is used in prod!
    const newPaymentMethod = await stripe.paymentMethods.create({
      type: 'sepa_debit',
      sepa_debit: {
        // https://docs.stripe.com/testing?testing-method=payment-methods&payment-method=sepa-direct-debit#non-card-payments
        // This will fail immediately when a charge is attempted
        iban: 'BE68539007547034'
      },
      billing_details: {
        name: customer.name,
        email: customer.email
      }
    });
    await stripe.paymentMethods.attach(newPaymentMethod.id, { customer: customer.id });
    await stripe.subscriptions.update(subscription.id, {
      default_payment_method: newPaymentMethod.id
    });
    // Detach the old payment method
    await stripe.paymentMethods.detach(paymentMethod.id);

    // Note: can't update a payment method
    // probably also can't confirm

    // Advance the test clock
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.items.data[0].current_period_end)
        .minus({ days: 4 })
        .toSeconds()
    });

    testClock = await pollForTestClockReady(testClock);

    // Check for the upcoming renewal email
    await hasExactlyOneEmailWithQuery(MAIL_UPCOMING);

    console.log('Advancing test clock, trying to charge for renewal...');
    // Advance the test clock
    // --> Stripe will attempt to charge the card, which will fail 3 times
    //     (depends on dashboard settings)
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.items.data[0].current_period_end)
        // 8 is not enough
        .plus({ days: 20 })
        .toSeconds()
    });
    await pollForTestClockReady(testClock);

    // Check for the all payments failed email
    await hasExactlyOneEmailWithQuery(MAIL_ALL_PAYMENTS_FAILED);

    // Remove potential irrelevant email that pollutes the inbox
    await clearEmailsByQuery('abandonedCartReminderEmail');
    // Check that no other emails got sent
    assert((await getEmails()).length === 3, 'total number of emails is unexpected');

    // Wait for handlers to finish after email
    await setTimeout(3000);

    // Check that the user is a superfan
    assert(
      (await db.collection('users').doc(user.uid).get()).data().superfan === false,
      'superfan was false after failed renewal'
    );
  }).timeout(0);
});

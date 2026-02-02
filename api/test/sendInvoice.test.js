// Send_invoice equivalent of chargeAutomatically.test.js, requires a Stripe Sandbox to be connected
// See  chargeAutomatically.test.js, remove the .skip() on the root describe if you want to run these
// tests
const assert = require('node:assert');
const dotenv = require('dotenv');
const { resolve } = require('node:path');
dotenv.config({ path: resolve(__dirname, '../.env.local'), quiet: true });
const { stripeSubscriptionKeys } = require('../src/subscriptions/constants');

const { collectionMethodKey } = stripeSubscriptionKeys;

const {
  clearAuth,
  clearFirestore,
  hasExactlyOneEmailWithQuery,
  clearEmails,
  getEmails,
  clearEmailsByQuery
} = require('./util/util');
const stripe = require('../src/subscriptions/stripe');

// Handlers we will call directly to avoid relying on webhook forwarding in CI
const { DateTime } = require('luxon');
const { setTimeout } = require('node:timers/promises');
const {
  createAndLinkTestClockCustomer,
  linkSubscription,
  pollForTestClockReady
} = require('./util/stripe');
const { db } = require('../seeders/app');

const MAIL_CONFIRMATION = 'subscriptionConfirmationEmail';
const MAIL_RENEWAL = 'subscriptionRenewalEmail';
const MAIL_THANK_YOU_MANUAL = 'subscriptionRenewalThankYouEmail';

describe.skip('send_invoice', () => {
  // Allow long-running Stripe operations
  beforeEach(async () => {
    await clearAuth();
    await clearFirestore();
    // Clear emails we might have lingering from other tests
    await clearEmails();
  });

  it('Happy path with payment card: charges first invoice, sends confirmation, sends renewal invitation, sends right thank you email after charge', async () => {
    let { user, customer, usersPrivateRef, testClock } = await createAndLinkTestClockCustomer();

    // Create a send_invoice subscription
    const priceId = process.env.STRIPE_PRICE_IDS_REDUCED;
    //
    // This by default finalizes the first invoice
    console.log('Creating subscription...');
    let subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      collection_method: 'send_invoice',
      days_until_due: 1,
      payment_settings: {
        payment_method_types: ['bancontact', 'card', 'ideal', 'sepa_debit']
      }
    });

    // Immediately finalize the invoice to create a payment intent, replicates
    // createOrRetrieveUnpaidSubscription behavior
    subscription.latest_invoice = await stripe.invoices.finalizeInvoice(
      /** @type {string} */ (subscription.latest_invoice)
    );

    // Note: we are NOT setting this up for off-session usage

    //
    // Create and attach a card payment method that will succeed in test mode
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa_debit' }
    });
    await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });

    await linkSubscription(usersPrivateRef, subscription);

    // Confirm the send invoice payment
    let paymentIntentId = /** @type {string} */ (
      /** @type {import('stripe').Stripe.Invoice } */ (subscription.latest_invoice).payment_intent
    );

    // Pay the first invoice
    await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethod.id
    });

    //
    // Check Mailpit for subscription confirmation
    await hasExactlyOneEmailWithQuery(MAIL_CONFIRMATION);

    // Wait for handlers
    // --> Calls the invoice.paid handler, which will convert the sub to charge_automatically
    console.log('Waiting for handlers post first payment');
    await setTimeout(8000);

    // To emulate the previous situation, we manually switch it back to send_invoice
    await stripe.subscriptions.update(subscription.id, {
      collection_method: 'send_invoice',
      days_until_due: 1,
      default_payment_method: null
    });
    console.log('Wait for sub update handlers to finish...');
    await setTimeout(5000);
    await usersPrivateRef.update({ [collectionMethodKey]: 'send_invoice' });

    console.log('Advancing to right after the renewal time...');
    // Advance the test clock
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.current_period_end)
        .plus({ days: 0.25 })
        .toSeconds()
    });
    testClock = await pollForTestClockReady(testClock);

    // Wait for invoice.created to be handled
    console.log('Wait for renewal invoice.created handled');
    await setTimeout(8000);

    // Check for the renewal invitation email
    await hasExactlyOneEmailWithQuery(MAIL_RENEWAL);

    //
    // Update the subscription
    subscription = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['latest_invoice']
    });
    await linkSubscription(usersPrivateRef, subscription);
    //
    // Confirm the send invoice renewal payment
    paymentIntentId = /** @type {string} */ (
      /** @type {import('stripe').Stripe.Invoice } */ (subscription.latest_invoice).payment_intent
    );

    console.log('Confirm renewal payment');
    await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethod.id
    });
    //
    // Wait for handlers to finish after email
    console.log('Wait for invoice.paid handlers...');
    await setTimeout(5000);

    console.log('Advancing to 2 day after the renewal period');
    // Advance the test clock (the subscription object is of the new period)
    testClock = await stripe.testHelpers.testClocks.advance(testClock.id, {
      frozen_time: DateTime.fromSeconds(subscription.current_period_start)
        .plus({ days: 2 })
        .toSeconds()
    });
    testClock = await pollForTestClockReady(testClock);

    // Check for the thank you email
    await hasExactlyOneEmailWithQuery(MAIL_THANK_YOU_MANUAL);

    // Remove potential irrelevant email that pollutes the inbox
    await clearEmailsByQuery('abandonedCartReminderEmail');
    // Check that no other emails got sent
    assert((await getEmails()).length === 3, 'total number of emails is unexpected');

    // Check that the user is a superfan
    assert(
      (await db.collection('users').doc(user.uid).get()).data().superfan === true,
      'superfan was not true after renewal'
    );
    assert.strictEqual(
      (await usersPrivateRef.get()).data().stripeSubscription?.collectionMethod,
      'charge_automatically',
      'collection method after renewal was not charge_automatically'
    );
  }).timeout(0);
});

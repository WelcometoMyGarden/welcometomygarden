const { DateTime } = require('luxon');
const { createNewUser } = require('../../seeders/util');
const stripe = require('../../src/subscriptions/stripe');
const { db } = require('../../seeders/app');
const { stripeSubscriptionKeys } = require('../../src/subscriptions/constants');
const { faker } = require('@faker-js/faker/locale/fr');
const { normalize } = require('./util');
const { setTimeout } = require('node:timers/promises');

const {
  idKey,
  statusKey,
  priceIdKey,
  latestInvoiceStatusKey,
  currentPeriodStartKey,
  currentPeriodEndKey,
  startDateKey,
  cancelAtKey,
  canceledAtKey,
  collectionMethodKey
} = stripeSubscriptionKeys;

exports.createAndLinkTestClockCustomer = async function (locale) {
  // 1) Create a Firebase user
  const firstName = faker.person.firstName();
  const testEmail = `test_charge_auto_${normalize(firstName)}_${Date.now()}@slowby.travel`;

  const user = await createNewUser(
    { email: testEmail },
    { firstName, lastName: 'Test', countryCode: 'BE', communicationLanguage: locale ?? 'en' }
  );
  const uid = user.uid;

  // Create a Stripe test clock and a customer attached to it
  let testClock = await stripe.testHelpers.testClocks.create({
    frozen_time: DateTime.now().toUnixInteger(),
    name: `Auto-charge test ${firstName} ${DateTime.now().toLocaleString({
      dateStyle: 'short',
      timeStyle: 'short'
    })}`
  });

  const customer = await stripe.customers.create({
    email: testEmail,
    name: firstName,
    metadata: { wtmg_id: uid },
    // Attach to the test clock so that advancing the clock affects invoices/subscriptions
    test_clock: testClock.id
  });

  const usersPrivateRef = /** @type {DocumentReference<UserPrivate>} */ (
    db.collection('users-private').doc(uid)
  );

  await usersPrivateRef.update({ stripeCustomerId: customer.id });

  return { email: testEmail, user, usersPrivateRef, testClock, customer };
};

/**
 *
 * @param {DocumentReference<UserPrivate>} usersPrivateRef firestore doc ref
 * @param {import('stripe').Stripe.Subscription} subscription stripe sub with expanded latestInvoice
 */
exports.linkSubscription = async function (usersPrivateRef, subscription) {
  // --> Calls the customer.subscription.created handler, but this one is not relevant for us
  // Link to Firebase
  await usersPrivateRef.update({
    [idKey]: subscription.id,
    [priceIdKey]: subscription.items.data[0].price.id,
    [statusKey]: subscription.status,
    [latestInvoiceStatusKey]: /** @type {import('stripe').Stripe.Invoice} */ (
      subscription.latest_invoice
    ).status,
    [startDateKey]: subscription.start_date,
    [currentPeriodStartKey]: subscription.current_period_start,
    [currentPeriodEndKey]: subscription.current_period_end,
    [cancelAtKey]: subscription.cancel_at,
    [canceledAtKey]: subscription.canceled_at,
    [collectionMethodKey]: subscription.collection_method
  });
};

// Modifies the test clock reference
exports.pollForTestClockReady = async function (testClock) {
  // Poll for test clock readinesss
  while (testClock.status !== 'ready') {
    if (testClock.status === 'internal_failure') {
      console.error(`Stripe test clock internal failure (${testClock.id})`);
      process.exit(1);
    }
    console.log('Polling for testclock status...');
    await setTimeout(2000);
    testClock = await stripe.testHelpers.testClocks.retrieve(testClock.id);
  }
  console.log('OK');
  return testClock;
};

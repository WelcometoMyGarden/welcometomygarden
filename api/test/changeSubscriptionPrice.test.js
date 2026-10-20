// Requires a Stripe Sandbox to be connected, see chargeAutomatically.test.js.
// Remove the .skip() on the root describe if you want to run these tests.
const assert = require('node:assert');
const dotenv = require('dotenv');
const { resolve } = require('node:path');
dotenv.config({ path: resolve(__dirname, '../.env.local'), quiet: true });
if (!process.env.STAGING) {
  dotenv.config({ path: resolve(__dirname, '../.env.test.local'), quiet: true });
}

const { clearAuth, clearFirestore } = require('./util/util');
const stripe = require('../src/subscriptions/stripe');
const { createAndLinkTestClockCustomer } = require('./util/stripe');
const {
  createOrRetrieveUnpaidSubscription
} = require('../src/subscriptions/createOrRetrieveUnpaidSubscription');
const { getSubscriptionPeriod } = require('../src/subscriptions/basilCompat');
const { isRenewalPeriod } = require('../src/subscriptions/stripeEventHandlers/util');

describe('changeSubscriptionPrice', () => {
  beforeEach(async () => {
    await clearAuth();
    await clearFirestore();
  });

  it('switches an unpaid first invoice to the full amount of a new recurring price', async () => {
    const { user, usersPrivateRef } = await createAndLinkTestClockCustomer();
    const reducedPriceId = /** @type {string} */ (process.env.STRIPE_PRICE_IDS_REDUCED);
    const normalPriceId = /** @type {string} */ (process.env.STRIPE_PRICE_IDS_NORMAL);
    /** @param {string} priceId */
    const request = (priceId) =>
      /** @type {FV2.CallableRequest<{priceId: string, locale: string}>} */ (
        /** @type {unknown} */ ({
          auth: { uid: user.uid },
          data: { priceId, locale: 'en' }
        })
      );

    const first = await createOrRetrieveUnpaidSubscription(request(reducedPriceId));
    const firstSubscription = await stripe.subscriptions.retrieve(first.subscriptionId);
    const firstInvoiceId = /** @type {string} */ (firstSubscription.latest_invoice);

    const second = await createOrRetrieveUnpaidSubscription(request(normalPriceId));

    // The same subscription is reused
    assert.equal(second.subscriptionId, first.subscriptionId);
    assert.ok(second.clientSecret);

    // The previous invoice can't be paid anymore
    const firstInvoice = await stripe.invoices.retrieve(firstInvoiceId);
    assert.equal(firstInvoice.status, 'void');

    const subscription = await stripe.subscriptions.retrieve(second.subscriptionId, {
      expand: ['latest_invoice']
    });
    const newInvoice = /** @type {import('stripe').Stripe.Invoice} */ (subscription.latest_invoice);
    const normalPrice = await stripe.prices.retrieve(normalPriceId);

    // The new invoice charges the full new price, and references the real recurring price
    assert.equal(newInvoice.status, 'open');
    assert.equal(newInvoice.amount_due, normalPrice.unit_amount);
    assert.equal(newInvoice.lines.data.length, 1);
    assert.equal(newInvoice.lines.data[0].pricing?.price_details?.price, normalPriceId);
    assert.equal(newInvoice.metadata?.billing_reason_override, 'subscription_create');

    // Firestore reflects the new price and period, which is still considered the first period
    const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriod(subscription);
    const { stripeSubscription } = (await usersPrivateRef.get()).data();
    assert.equal(stripeSubscription.priceId, normalPriceId);
    assert.equal(stripeSubscription.currentPeriodStart, currentPeriodStart);
    assert.equal(stripeSubscription.currentPeriodEnd, currentPeriodEnd);
    assert.equal(stripeSubscription.startDate, subscription.start_date);
    assert.equal(isRenewalPeriod(stripeSubscription.startDate, currentPeriodStart), false);
  }).timeout(0);
});

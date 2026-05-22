const { defineString } = require('firebase-functions/params');
const stripe = require('../stripe');
const { getInvoiceSubscriptionId } = require('../basilCompat');

const stripePriceIdReduced = defineString('STRIPE_PRICE_IDS_REDUCED');
const stripePriceIdNormal = defineString('STRIPE_PRICE_IDS_NORMAL');
const stripePriceIdSolidarity = defineString('STRIPE_PRICE_IDS_SOLIDARITY');

const priceIdsObj = () => ({
  reduced: stripePriceIdReduced.value(),
  normal: stripePriceIdNormal.value(),
  solidarity: stripePriceIdSolidarity.value()
});

exports.wtmgPriceIds = () => Object.values(priceIdsObj());

/**
 * @type {() => {[key: string]: number}}
 */
exports.wtmgPriceIdToPrice = () =>
  Object.fromEntries(
    Object.entries(priceIdsObj()).map(([key, priceId]) => [
      priceId,
      { reduced: 36, normal: 60, solidarity: 120 }[key]
    ])
  );

exports.isWTMGPriceId = function (priceId) {
  return this.wtmgPriceIds().includes(priceId);
};

/**
 * @param {Omit<import('stripe').Stripe.Invoice, "id">} invoice
 */
exports.isWTMGInvoice = async (invoice) => {
  const { lines, amount_paid } = invoice;
  const lineOne = lines.data[0];

  // Basil: `price` on an invoice line item became the polymorphic `pricing`
  // object. For our standard recurring subs, pricing.price_details.price is
  // the recurring Price id and matches one of our STRIPE_PRICE_IDS_*.
  const directPriceId = lineOne?.pricing?.price_details?.price;
  if (directPriceId && this.isWTMGPriceId(directPriceId)) {
    return true;
  }

  // Fallback: this could be a modified first invoice (see [one-off-invoice]
  // in createOrRetrieveUnpaidSubscription.js — changeSubscriptionPrice deletes
  // the auto-prorated lines and re-adds a single InvoiceItem with `unit_amount`,
  // which makes Stripe attach a generated one-off Price that won't match our
  // WTMG ids). In that case, the canonical sub price lives on the Subscription
  // itself, reached via the new parent.subscription_details field.
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) {
    return false;
  }
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const subPrice = sub.items.data[0].price;
  if (subPrice.unit_amount !== amount_paid) {
    // Sanity log: matches the previous behaviour. Means the line item amount
    // and the subscription's current price are out of sync — possibly a
    // double price change. The boolean return is still driven by the sub's
    // price id below.
    console.error(`Weirdness occurred in ${sub.id}`);
  }
  return this.isWTMGPriceId(subPrice.id);
};

/**
 * @param {import('stripe').Stripe.Subscription} subscription
 */
exports.isWTMGSubscription = (subscription) => {
  const priceId = subscription.items.data[0].price.id;
  if (this.isWTMGPriceId(priceId)) {
    return true;
  }
  return false;
};

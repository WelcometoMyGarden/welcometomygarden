const { defineString } = require('firebase-functions/params');
const stripe = require('../stripe');
const { getInvoiceSubscriptionId } = require('../basilCompat');
const { oneDaySecs } = require('../../util/time');

const stripePriceIdReduced = defineString('STRIPE_PRICE_IDS_REDUCED');
const stripePriceIdNormal = defineString('STRIPE_PRICE_IDS_NORMAL');
const stripePriceIdSolidarity = defineString('STRIPE_PRICE_IDS_SOLIDARITY');

const priceIdsObj = () => ({
  reduced: stripePriceIdReduced.value(),
  normal: stripePriceIdNormal.value(),
  solidarity: stripePriceIdSolidarity.value()
});

const wtmgPriceIds = () => Object.values(priceIdsObj());
exports.wtmgPriceIds = wtmgPriceIds;

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

const isWTMGPriceId = (priceId) => wtmgPriceIds().includes(priceId);
exports.isWTMGPriceId = isWTMGPriceId;

/**
 * Whether the current period of a subscription is a renewal period, rather than its first period.
 *
 * Don't compare the two timestamps for equality: the first period may start a bit later than
 * the subscription itself, when its billing cycle anchor was reset by a price change shortly after
 * creation (see changeSubscriptionPrice). Renewal periods start roughly a year after the start date.
 * @param {number} startDate subscription start date, in epoch seconds
 * @param {number} currentPeriodStart start of the current period, in epoch seconds
 */
exports.isRenewalPeriod = (startDate, currentPeriodStart) =>
  currentPeriodStart - startDate > 30 * oneDaySecs;

/**
 * @param {Omit<Stripe.Invoice, "id">} invoice
 */
exports.isWTMGInvoice = async (invoice) => {
  const { lines, amount_paid } = invoice;
  const lineOne = lines.data[0];

  // Basil: `price` on an invoice line item became the polymorphic `pricing`
  // object. For our standard recurring subs, pricing.price_details.price is
  // the recurring Price id and matches one of our STRIPE_PRICE_IDS_*.
  const directPriceId = lineOne?.pricing?.price_details?.price;
  if (directPriceId && isWTMGPriceId(directPriceId)) {
    return true;
  }

  // Fallback: an invoice line can carry a generated one-off Price that doesn't match
  // our WTMG ids (e.g. for invoice items added with a custom amount). In that case,
  // the canonical sub price lives on the Subscription itself, reached via the
  // parent.subscription_details field. This occurred with a previous way in which
  // we handled customers changing the subscription price while the original
  // subscription was still incomplete.
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
  return isWTMGPriceId(subPrice.id);
};

/**
 * @param {Stripe.Subscription} subscription
 */
exports.isWTMGSubscription = (subscription) => {
  const priceId = subscription.items.data[0].price.id;
  if (isWTMGPriceId(priceId)) {
    return true;
  }
  return false;
};

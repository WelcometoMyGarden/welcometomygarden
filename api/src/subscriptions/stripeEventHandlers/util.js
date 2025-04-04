const { defineString } = require('firebase-functions/params');
const stripe = require('../stripe');

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
 * @param {import('stripe').Stripe.Invoice} invoice
 */
exports.isWTMGInvoice = async (invoice) => {
  const { lines, subscription, amount_paid } = invoice;
  const lineOne = lines.data[0];
  let price = null;
  if (lineOne != null && lineOne.price?.type === 'one_time') {
    // In this case, the plan is null, and then this was a modified invoice
    // (the customer changed their mind),
    // which had a new one-time price & product id generated for it by Stripe
    // Get the actual (hopefully!) current product & price from the subscription (?)
    // do verify with the amount?
    // if price->type is one_time instead of recurring
    // TODO: we should consider cancelling & recreating subs on change instead, to avoid confusing issues like this.
    //
    // The sub will contain the actual price ID of the sub plan.
    const sub = await stripe.subscriptions.retrieve(/** @type {string} */ (subscription));
    price = sub.items.data[0].price;
    if (price.unit_amount !== amount_paid) {
      // check if this person perhaps updated their sub two times?? :S
      // TODO 1: is the price ID info now used in an intergration? ARE THE FAKE ONES
      //          in our Firebase? That could lead to mega weirdness
      // TODO 2: update the product ID too (that one is also unique per invoice)
      console.error(`Weirdness occurred in ${sub.id}`);
    }
  } else {
    // Normal case
    price = lineOne.price;
  }

  const priceId = price?.id;
  if (this.isWTMGPriceId(priceId)) {
    return true;
  }
  return false;
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

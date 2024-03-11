// @ts-check
const functions = require('firebase-functions');
const stripe = require('../stripe');

const priceIdsObj = functions.config().stripe.price_ids;
const wtmgPriceIds = Object.values(priceIdsObj);

exports.wtmgPriceIds = wtmgPriceIds;

function isWTMGPriceId(priceId) {
  return wtmgPriceIds.includes(priceId);
}
exports.isWTMGPriceId = isWTMGPriceId;

/**
 * @param {import('stripe').Stripe.Invoice} invoice
 */
exports.isWTMGInvoice = async function (invoice) {
  // eslint-disable-next-line camelcase
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
    // eslint-disable-next-line camelcase
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
  if (isWTMGPriceId(priceId)) {
    return true;
  }
  return false;
};

/**
 * @param {import('stripe').Stripe.Subscription} subscription
 */
exports.isWTMGSubscription = function (subscription) {
  const priceId = subscription.items.data[0].price.id;
  if (isWTMGPriceId(priceId)) {
    return true;
  }
  return false;
};

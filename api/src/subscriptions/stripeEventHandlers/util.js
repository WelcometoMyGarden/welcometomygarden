// @ts-check
const functions = require('firebase-functions');

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
exports.isWTMGInvoice = function (invoice) {
  const priceId = invoice.lines.data[0].price?.id;
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

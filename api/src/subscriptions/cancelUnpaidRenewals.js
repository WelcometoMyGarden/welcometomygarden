// @ts-check
// The es6-promise-pool to limit the concurrency of promises.
// Docs: https://www.npmjs.com/package/es6-promise-pool
// Suggested on: https://firebase.google.com/docs/functions/schedule-functions?gen=2nd
const { logger } = require('firebase-functions');
const PromisePool = require('es6-promise-pool');
const { db } = require('../firebase');
const { stripeSubscriptionKeys } = require('./constants');
const stripe = require('./stripe');

// Maximum concurrent cancellation operations.
const MAX_CONCURRENT = 3;

const { statusKey, latestInvoiceStatusKey, startDateKey } = stripeSubscriptionKeys;

module.exports = async () => {
  // One year ago (365 days)
  // NOTE: this may cause some inconsistencies depending on how Stripe sees a year
  const nowSecs = new Date().getTime() / 1000;
  const oneYearAgoSecs = nowSecs - 365 * 24 * 60 * 60;
  const oneMonthAgo = nowSecs - 31 * 24 * 60 * 60;
  const oneWeekAgoSecs = nowSecs - 7 * 24 * 60 * 60;

  // Get all users with a subscription that expired >= 7 days ago
  //
  // There are compound query limitations, so we can't use all combinations of conditions.
  // Further filtering is done below on the downloaded data.
  // https://firebase.google.com/docs/firestore/query-data/queries#limitations
  const query = db
    .collection('users-private')
    // The subscription status is "past_due"
    // based on the default settings we're using, it goes from 'active' to 'past_due' 24 hours
    // after the creation of a (renewal) invoice
    .where(statusKey, '==', 'past_due')
    // UNUSED: The last invoice isn't paid
    // .where(latestInvoiceStatusKey, '!=', 'paid')
    // INSTEAD: The last invoice is open (avoid compound query limitations on '!=')
    .where(latestInvoiceStatusKey, '==', 'open')
    // The start date is over a year ago (to only get those invoices that are renewals)
    .where(startDateKey, '<=', oneYearAgoSecs);

  const { docs } = await query.get();

  // Further filtering
  const filteredDocs = docs.filter((doc) => {
    const sub = doc.data().stripeSubscription;
    // Renewal invoice link exists (it should be created only upon renewal, so must exist)
    return (
      !!sub.renewalInvoiceLink &&
      // last period started more than 7 days ago
      sub.currentPeriodStart <= oneWeekAgoSecs &&
      // ... but also at most one month ago
      sub.currentPeriodStart >= oneMonthAgo
    );
  });

  // https://www.npmjs.com/package/es6-promise-pool#iterator
  const generatePromises = function* () {
    for (let i = 0; i < filteredDocs.length; i += 1) {
      const doc = filteredDocs[i];
      const data = doc.data();
      // Create a promise that first cancels the subscription, then voids its last invoice
      //
      // A voided invoice can not be paid anymore.
      // By default, the invoice is left open (and marked uncollectible after 30 days, depending on Billing settings)
      // An uncollectible invoice can still be paid, but because cancellation switches off the invoice auto-advance,
      // I'm not sure  if the original subscription is marked active again (not tested)
      // In any case, for predictability, marking as "void" after 7 days is best to force the user to start a new subscription.
      yield stripe.subscriptions
        .cancel(data.stripeSubscription.id)
        .then(async (cancelledSubscription) => {
          if (typeof cancelledSubscription.latest_invoice === 'string') {
            const voidedInvoice = await stripe.invoices.voidInvoice(
              cancelledSubscription.latest_invoice
            );
            // Sync this status to the users-private doc
            await doc.ref.update({ [latestInvoiceStatusKey]: voidedInvoice.status });
            logger.log(
              `Successfully canceled the subscription ${data.stripeSubscription.id} of ${data.stripeCustomerId} and voided its latest invoice`
            );
          }
          return true;
        })
        .catch((e) => {
          logger.error(e);
          logger.error(
            `Something went wrong when cancelling the subscription ${data.stripeSubscription.id}, or voiding its latest invoice.`
          );
        });
      // Note: because the subscription was cancelled, the subscription.deleted event will result in an email
    }
  };

  const promiseIterator = generatePromises();
  const pool = new PromisePool(promiseIterator, MAX_CONCURRENT);
  await pool
    .start()
    .then(() => logger.log(`Completed ${filteredDocs.length} cancellations`))
    .catch(() => logger.error(`Couldn't finish ${filteredDocs.length} cancellations`));
};

// The es6-promise-pool to limit the concurrency of promises.
// Docs: https://www.npmjs.com/package/es6-promise-pool
// Suggested on: https://firebase.google.com/docs/functions/schedule-functions?gen=2nd
const { logger } = require('firebase-functions');
const PromisePool = require('es6-promise-pool');
const { stripeSubscriptionKeys } = require('../constants');
const stripe = require('../stripe');
const { oneWeekAgoSecs, oneMonthAgoSecs } = require('../../util/time');
const { userPrivateDocIds } = require('./shared');

// Maximum concurrent cancellation operations.
const MAX_CONCURRENT = 3;

const { latestInvoiceStatusKey } = stripeSubscriptionKeys;

/**
 * Note: this function cancels the subscription of unpaid renewals after 7 days.
 *
 * Stripe's minimum term in the Dashboard settings was to wait for a payment was 30 days,
 * while wanted to cap this at 7 days.
 *
 * A cancellation will trigger a subscription.deleted event, which will send an email to the user.
 * This doesn't happen here.
 *
 * @param {QueryDocumentSnapshot<UserPrivate>[]} docs candidate documents with an open last invoice and start date over 1 year ago
 */
module.exports = async (docs) => {
  // Further filtering
  const filteredDocs = docs.filter((doc) => {
    const sub = doc.data().stripeSubscription;
    return (
      // *Fully ignore* charge_automatically subscriptions.
      // These will be auto-handled and cancelled by Stripe dashboard settings in 7 days.
      // Eventually, this entire function can be removed when all active subscriptions have migrated from
      // 'send_invoice' to 'charge_automatically'
      sub.collectionMethod !== 'charge_automatically' &&
      // Renewal invoice link exists (it should be created only upon renewal, so must exist)
      !!sub.renewalInvoiceLink &&
      // last period started more than 7 days ago
      sub.currentPeriodStart <= oneWeekAgoSecs() &&
      // ... but also at most one month ago
      sub.currentPeriodStart >= oneMonthAgoSecs() &&
      // ... and there is no pending SEPA payment
      !sub.paymentProcessing
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
  // @ts-ignore the docs add `new` in all their examples.
  const pool = new PromisePool(promiseIterator, MAX_CONCURRENT);
  const idList = userPrivateDocIds(
    filteredDocs.map((d) => ({
      id: d.id
    }))
  );
  await pool
    .start()
    .then(() => logger.log(`Completed cancellations for ${idList} `))
    .catch(() => logger.error(`Couldn't finish ${idList} cancellations`));
};

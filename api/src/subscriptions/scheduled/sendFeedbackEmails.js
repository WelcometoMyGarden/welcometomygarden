const { db } = require('../../firebase');
const { stripeSubscriptionKeys } = require('../constants');
const { lxHourStart } = require('../../util/time');
const { sendSubscriptionEndedFeedbackEmail } = require('../../mail');
const { FEEDBACK_EMAIL_DAYS_AFTER_EXPIRY, processUserPrivateDocs } = require('./shared');

const { statusKey, currentPeriodStartKey, collectionMethodKey, canceledAtKey } =
  stripeSubscriptionKeys;

exports.sendManualRenewalFeedbackEmails = async () => {
  // The current period started 7 + 5 days ago
  // 7 days: time until the subscription is canceled
  // 5 days: wait to ask for feedback
  const lxFeedbackThreshold = lxHourStart.minus({ days: FEEDBACK_EMAIL_DAYS_AFTER_EXPIRY });
  // We're looking for renewals that have auto-canceled with the scheduled function here

  const query = /**
   * @type {CollectionReference<UserPrivate>}
   */ (db.collection('users-private'))
    // WARNING: the below condition should not be added as an optimization,
    // "!= value" also implicitly excludes undefined values (like SQL would)
    // but we want to include undefined values for collection_method...
    //    .where(collectionMethodKey, '!=', 'charge_automatically')
    // The subscription status is "canceled"
    .where(statusKey, '==', 'canceled')
    // extract window of exactly one hour before the threshold
    .where(currentPeriodStartKey, '<=', lxFeedbackThreshold.toSeconds())
    .where(currentPeriodStartKey, '>', lxFeedbackThreshold.minus({ hour: 1 }).toSeconds());

  const { docs } = await query.get();

  // todo: further filtering by startDate & currentPeriodStart to be sure
  const filteredDocs = docs.filter((doc) => {
    const sub = doc.data().stripeSubscription;
    return (
      // Exclude charge_automatically subs from this email
      sub.collectionMethod !== 'charge_automatically' &&
      // Renewal invoice link exists (it should be created only upon renewal, so must exist)
      !!sub.renewalInvoiceLink &&
      // This is a renewal (2nd check)
      // NOTE: this is not reliable, in case the cycle date was manually reset
      sub.currentPeriodStart !== sub.startDate
    );
  });

  await processUserPrivateDocs(
    filteredDocs,
    async (combinedUser) => {
      // Send renewal invoice email
      await sendSubscriptionEndedFeedbackEmail(
        combinedUser.email,
        combinedUser.displayName,
        combinedUser.communicationLanguage
      );
    },
    'Sending feedback emails (manual renewal)'
  );
};

/**
 * Sends the same feedback-asking email as for manual renewals, but does this on a different
 * variable timing:
 * - either after (1+3+3) + 5 days, which is when the renewal payment retry flow will delete unpaid subs
 * - or 5 days after a previously canceled subscription naturally deletes itself
 */
exports.sendAutomaticRenewalFeedbackEmails = async () => {
  const lxFeedbackThreshold = lxHourStart.minus({ days: 5 });
  // We're looking for all types of subscription deletions of 5 days ago with charge_automatically,
  // (prior user cancellation, or failed payments)

  // TODO: how to exclude forced cancellations? these should be rare
  // we can check if it's possible to fetch the sub, and check if cancel_at_period_end has a value
  // (= not forced)

  const query = /**
   * @type {CollectionReference<UserPrivate>}
   */ (db.collection('users-private'))
    .where(collectionMethodKey, '==', 'charge_automatically')
    // The subscription status is "canceled"
    .where(
      statusKey,
      '==',
      /** @satisfies {import('stripe').Stripe.Subscription['status']}*/ ('canceled')
    )
    // Extract a one-hour window, of the sub being canceled exactly within one hour before 5 days ago,
    // end-inclusive
    .where(canceledAtKey, '<=', lxFeedbackThreshold.toSeconds())
    .where(canceledAtKey, '>', lxFeedbackThreshold.minus({ hour: 1 }).toSeconds());

  const { docs: filteredDocs } = await query.get();

  // NOTE: this relies on charge_automatically never applying to first unpaid invoices...
  // If needed, fetch the stripe sub & latest invoice, and confirm that the latest invoice
  // was NOT an unpaid sub creation invoice

  await processUserPrivateDocs(
    filteredDocs,
    async (combinedUser) => {
      // Send renewal invoice email
      await sendSubscriptionEndedFeedbackEmail(
        combinedUser.email,
        combinedUser.displayName,
        combinedUser.communicationLanguage
      );
    },
    'Sending feedback emails (automatic renewal)'
  );
};

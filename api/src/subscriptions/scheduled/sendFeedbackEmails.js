const { usersPrivateCol } = require('../../collections');
const { stripeSubscriptionKeys } = require('../constants');
const { lxHourStart } = require('../../util/time');
const { sendSubscriptionEndedFeedbackEmail } = require('../../mail');
const { processUserPrivateDocs } = require('./shared');

const { statusKey, collectionMethodKey, canceledAtKey } = stripeSubscriptionKeys;

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

  const query = usersPrivateCol()
    .where(collectionMethodKey, '==', 'charge_automatically')
    // The subscription status is "canceled"
    .where(statusKey, '==', /** @satisfies {Stripe.Subscription['status']}*/ ('canceled'))
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
      await sendSubscriptionEndedFeedbackEmail({
        email: combinedUser.email,
        firstName: combinedUser.displayName,
        language: combinedUser.communicationLanguage,
        secret: combinedUser.secret,
        wtmg_id: combinedUser.uid
      });
    },
    'Sending feedback emails (automatic renewal)'
  );
};

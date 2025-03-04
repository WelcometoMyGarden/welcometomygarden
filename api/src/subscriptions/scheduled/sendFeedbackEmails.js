const { db } = require('../../firebase');
const { stripeSubscriptionKeys } = require('../constants');
const { lxHourStart } = require('../../util/time');
const { sendSubscriptionEndedFeedbackEmail } = require('../../mail');
const { FEEDBACK_EMAIL_DAYS_AFTER_EXPIRY, processUserPrivateDocs } = require('./shared');

const { statusKey, currentPeriodStartKey } = stripeSubscriptionKeys;

module.exports = async () => {
  const lxFeedbackThreshold = lxHourStart.minus({ days: FEEDBACK_EMAIL_DAYS_AFTER_EXPIRY });
  // We're looking for renewals that have auto-canceled with the scheduled function here

  const query = /**
   * @type {CollectionReference<UserPrivate>}
   */ (db.collection('users-private'))
    // The subscription status is "canceled"
    .where(statusKey, '==', 'canceled')
    // The current period started 7 + 5 days ago
    // 7 days: time until the subscription is canceled
    // 5 days: wait to ask for feedback
    .where(currentPeriodStartKey, '<=', lxFeedbackThreshold.toSeconds());
  // TODO add a reasonable ">" here - we don't need all canceled subscriptions here, and we
  // can two > < on the same field?

  const { docs } = await query.get();

  // todo: further filtering by startDate & currentPeriodStart to be sure
  const filteredDocs = docs.filter((doc) => {
    const sub = doc.data().stripeSubscription;
    return (
      // Renewal invoice link exists (it should be created only upon renewal, so must exist)
      !!sub.renewalInvoiceLink &&
      // This is a renewal (2nd check)
      // NOTE: this is not reliable, in case the cycle date was manually reset
      sub.currentPeriodStart !== sub.startDate &&
      // Extract a one-hour window
      sub.currentPeriodStart <= lxFeedbackThreshold.toSeconds() &&
      sub.currentPeriodStart > lxFeedbackThreshold.minus({ hour: 1 }).toSeconds()
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
    'Sending feedback emails'
  );
};

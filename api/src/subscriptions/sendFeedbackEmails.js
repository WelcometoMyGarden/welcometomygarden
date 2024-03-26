// @ts-check
const { logger } = require('firebase-functions');
const { db, auth } = require('../firebase');
const { stripeSubscriptionKeys } = require('./constants');
const { lxHourStart } = require('../util/time');
const { sendSubscriptionEndedFeedbackEmail } = require('../mail');

const { statusKey, currentPeriodStartKey } = stripeSubscriptionKeys;
module.exports = async () => {
  const FEEDBACK_EMAIL_DELAY_DAYS = 5;
  const lxFeedbackThreshold = lxHourStart.minus({ days: 7 + FEEDBACK_EMAIL_DELAY_DAYS });
  // We're looking for renewals that have auto-canceled with the scheduled function here

  const query = db
    .collection('users-private')
    // The subscription status is "canceled"
    .where(statusKey, '==', 'canceled')
    // The current period started 7 + 5 days ago
    // 7 days: time until the subscription is canceled
    // 5 days: wait to ask for feedback
    .where(currentPeriodStartKey, '<=', lxFeedbackThreshold.toSeconds());

  const { docs } = await query.get();

  // todo: further filtering by startDate & currentPeriodStart to be sure
  const filteredDocs = docs.filter((doc) => {
    const sub = doc.data().stripeSubscription;
    return (
      // Renewal invoice link exists (it should be created only upon renewal, so must exist)
      !!sub.renewalInvoiceLink &&
      // This is a renewal (2nd check)
      sub.currentPeriodStart !== sub.startDate &&
      // Extract a one-hour window
      sub.currentPeriodStart <= lxFeedbackThreshold.toSeconds() &&
      sub.currentPeriodStart > lxFeedbackThreshold.minus({ hour: 1 }).toSeconds()
    );
  });

  await Promise.all(
    filteredDocs.map(async (userPrivateDoc) => {
      const authUser = await auth.getUser(userPrivateDoc.id);

      if (!authUser || !authUser.email || !authUser.displayName) {
        logger.error(
          `User with ID ${userPrivateDoc.id} not found, or doesn't have the required data for our email`
        );
        return;
      }

      const data = userPrivateDoc.data();
      // Send renewal invoice email
      await sendSubscriptionEndedFeedbackEmail(
        authUser.email,
        authUser.displayName,
        data.communicationLanguage
      );
    })
  );
};

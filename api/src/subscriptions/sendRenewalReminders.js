// @ts-check
//
const { logger } = require('firebase-functions');
const { auth } = require('../firebase');
const { nowSecs, oneDaySecs, oneHourSecs } = require('../util/time');
const { sendSubscriptionRenewalReminderEmail } = require('../mail');

/**
 * @param {import('firebase-admin').firestore.QueryDocumentSnapshot[]} docs candidate documents with an open last invoice and start date over 1 year
 */
module.exports = async (docs) => {
  // Further filtering
  // After the actions are taken here, the invoice status won't be "past_due" anymore,
  // so we should only get those that are still unpaid and not yet cancelled.
  const filteredDocs = docs.filter((doc) => {
    const sub = doc.data().stripeSubscription;
    const fiveDaysAgoSecs = nowSecs() - 5 * oneDaySecs();
    // Renewal invoice link exists (it should be created only upon renewal, so must exist)
    return (
      !!sub.renewalInvoiceLink &&
      // last period started EXACTLY 5 days ago (within a 1 hour margin)
      // We need the function to run hourly to prevent including the same users twice.
      // NOTE: the accuracy of this will kind of depend on the accuracy when the function runs (consistenly hourly!)
      sub.currentPeriodStart <= fiveDaysAgoSecs &&
      sub.currentPeriodStart > fiveDaysAgoSecs - oneHourSecs()
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
      await sendSubscriptionRenewalReminderEmail({
        email: authUser.email,
        firstName: authUser.displayName,
        renewalLink: data.stripeSubscription.renewalInvoiceLink,
        language: data.communicationLanguage
      });
    })
  );
};

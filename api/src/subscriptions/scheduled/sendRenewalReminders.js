// @ts-check
//
const { lxHourStart } = require('../../util/time');
const { sendSubscriptionRenewalReminderEmail } = require('../../mail');
const { FIRST_REMINDER_EMAIL_DELAY_DAYS, processUserPrivateDocs } = require('./shared');

/**
 * @param {import('firebase-admin').firestore.QueryDocumentSnapshot[]} docs candidate documents with an open last invoice and start date over 1 year ago
 */
module.exports = async (docs) => {
  // Further filtering
  // After the actions are taken here, the invoice status won't be "past_due" anymore,
  // so we should only get those that are still unpaid and not yet cancelled.
  const filteredDocs = docs.filter((doc) => {
    const sub = doc.data().stripeSubscription;
    const lxFiveDaysAgoSecs = lxHourStart.minus({ days: FIRST_REMINDER_EMAIL_DELAY_DAYS });
    // Renewal invoice link exists (it should be created only upon renewal, so must exist)
    return (
      !!sub.renewalInvoiceLink &&
      // last period started EXACTLY 5 days ago (within a 1 hour margin)
      // We need the function to run hourly to prevent including the same users twice.
      // NOTE: the accuracy of this will kind of depend on the accuracy when the function runs (consistenly hourly!)
      sub.currentPeriodStart <= lxFiveDaysAgoSecs.toSeconds() &&
      sub.currentPeriodStart > lxFiveDaysAgoSecs.minus({ hour: 1 }).toSeconds()
    );
  });

  await processUserPrivateDocs(
    filteredDocs,
    async (combinedUser) => {
      // Send renewal invoice email
      await sendSubscriptionRenewalReminderEmail({
        email: combinedUser.email,
        firstName: combinedUser.displayName,
        renewalLink: combinedUser.stripeSubscription.renewalInvoiceLink,
        language: combinedUser.communicationLanguage
      });
    },
    'Sending renewal reminder emails'
  );
};
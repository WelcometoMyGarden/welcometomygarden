//
const { lxHourStart } = require('../../util/time');
const { sendSubscriptionRenewalReminderEmail } = require('../../mail');
const { FIRST_REMINDER_EMAIL_DELAY_DAYS, processUserPrivateDocs } = require('./shared');
const { wtmgPriceIdToPrice } = require('../stripeEventHandlers/util');

/**
 * @param {QueryDocumentSnapshot<UserPrivate>[]} docs candidate documents with an open last invoice and start date over 1 year ago
 */
module.exports = async (docs) => {
  // Further filtering
  const filteredDocs = docs.filter((doc) => {
    const sub = doc.data().stripeSubscription;
    const lxFiveDaysAgoSecs = lxHourStart.minus({ days: FIRST_REMINDER_EMAIL_DELAY_DAYS });
    return (
      // Renewal invoice link exists (it should be created only upon renewal, so must exist)
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
      // Rounded euro price of the price ID
      const price = wtmgPriceIdToPrice()[combinedUser.stripeSubscription?.priceId];
      // Send renewal invoice email
      await sendSubscriptionRenewalReminderEmail({
        email: combinedUser.email,
        firstName: combinedUser.displayName,
        renewalLink: combinedUser.stripeSubscription.renewalInvoiceLink,
        language: combinedUser.communicationLanguage,
        price
      });
    },
    'Sending renewal reminder emails'
  );
};

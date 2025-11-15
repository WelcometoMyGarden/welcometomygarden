const {
  sendCancelledRenewalReminderEmail7DaysEmail,
  sendCancelledRenewalReminderEmail2DaysEmail
} = require('../../mail');
const { frontendUrl } = require('../../sharedConfig');
const { lxHourStart, oneWeekSecs, oneHourSecs, oneDaySecs } = require('../../util/time');
const stripe = require('../stripe');
const { wtmgPriceIdToPrice } = require('../stripeEventHandlers/util');
const { processUserPrivateDocs } = require('./shared');

/**
 * @param {number} endTimeSeconds
 * @returns {(d: QueryDocumentSnapshot<UserPrivate>) => boolean} boolean whether the
 */
const toBeCanceledWithin1HourBeforeOrAt = (endTimeSeconds) => (d) => {
  const ca = d.data().stripeSubscription?.cancelAt;
  if (typeof ca !== 'number') {
    return false;
  }
  // process exactly the hour before the end time, end inclusive
  if (ca > endTimeSeconds - oneHourSecs && ca <= endTimeSeconds) return true;
  return false;
};

/**
 * @param {QueryDocumentSnapshot<UserPrivate>[]} docs candidate documents with an open last invoice and start date over 1 year ago
 */
exports.sendCancelledRenewalReminderEmail7Days = async function (docs) {
  const filteredDocs = docs.filter(
    toBeCanceledWithin1HourBeforeOrAt(lxHourStart.toSeconds() + oneWeekSecs)
  );
  await processUserPrivateDocs(
    filteredDocs,
    async ({ email, stripeSubscription, stripeCustomerId, displayName, communicationLanguage }) => {
      // Rounded euro price of the price ID
      const price = wtmgPriceIdToPrice()[stripeSubscription?.priceId];
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: /** @type {string} */ (stripeCustomerId),
        return_url: `${frontendUrl()}/account`
      });
      // Send email
      await sendCancelledRenewalReminderEmail7DaysEmail({
        email,
        firstName: displayName,
        portalLink: portalSession.url,
        language: communicationLanguage,
        price
      });
    },
    'Sending cancelled renenewal reminder emails (7 days before)'
  );
};

/**
 * @param {QueryDocumentSnapshot<UserPrivate>[]} docs candidate documents with an open last invoice and start date over 1 year ago
 */
exports.sendCancelledRenewalReminderEmail2Days = async function (docs) {
  const filteredDocs = docs.filter(
    toBeCanceledWithin1HourBeforeOrAt(lxHourStart.toSeconds() + 2 * oneDaySecs)
  );
  await processUserPrivateDocs(
    filteredDocs,
    async ({ email, stripeCustomerId, displayName, communicationLanguage }) => {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: /** @type {string} */ (stripeCustomerId),
        return_url: `${frontendUrl()}/account`
      });
      // Send email
      await sendCancelledRenewalReminderEmail2DaysEmail({
        email,
        firstName: displayName,
        portalLink: portalSession.url,
        language: communicationLanguage
      });
    },
    'Sending cancelled renenewal reminder emails (2 days before)'
  );
};

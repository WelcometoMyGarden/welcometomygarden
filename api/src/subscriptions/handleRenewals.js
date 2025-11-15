const cancelUnpaidManualRenewals = require('./scheduled/cancelUnpaidManualRenewals');
const { db } = require('../firebase');
const { stripeSubscriptionKeys } = require('./constants');
const { oneYearAgoSecs, lxHourStart } = require('../util/time');
const sendManualRenewalReminders = require('./scheduled/sendManualRenewalReminders');
const {
  sendManualRenewalFeedbackEmails,
  sendAutomaticRenewalFeedbackEmails
} = require('./scheduled/sendFeedbackEmails');
const {
  sendCancelledRenewalReminderEmail7Days,
  sendCancelledRenewalReminderEmail2Days
} = require('./scheduled/sendCancelledRenewalReminders');

const { statusKey, latestInvoiceStatusKey, startDateKey, collectionMethodKey, cancelAtKey } =
  stripeSubscriptionKeys;

exports.handleManualRenewals = async () => {
  // Get all users with a send_invoice subscription that expired, known from the status being "past_due"
  // and the start date being over a year ago (365 days).
  // NOTE: this may cause some inconsistencies depending on how Stripe sees a year
  //
  // Further filtering should be done to know exactly when the subscription expired.
  // We can't do that here because of compound query limitations
  // (e.g. can't combine an == condition with a != condition)
  // https://firebase.google.com/docs/firestore/query-data/queries#limitations
  const sendInvoiceQuery = /** @type {Query<UserPrivate>} */ (
    db
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
      .where(startDateKey, '<=', oneYearAgoSecs())
  );

  const sendInvoiceDocs = (await sendInvoiceQuery.get()).docs.filter(
    (d) =>
      // undefined is the expected for value all legacy send_invoice subscriptions
      d.data().stripeSubscription?.collectionMethod == null ||
      d.data().stripeSubscription?.collectionMethod !== 'charge_automatically'
  );

  // Comments here document the send_invoice renewal process that this function is a part of.
  // (1) the first renewal prompt email is sent when renewal invoice is created
  // for the new period (when the first period ended),
  // `sendSubscriptionRenewalEmail()` in `./stripeEventHandlers/invoiceCreated.js`
  // SG email: "Renewal 7 days before [cancellation]" (seen from the user's perspective)
  await Promise.all([
    // (2) Send renewal reminders 5 days after the period ended
    // SG email: "Renewal 2 days before [cancellation]"
    sendManualRenewalReminders(sendInvoiceDocs),
    // (3) Fully cancel the subscription in case of no renewal after 7 days
    // `sendSubscriptionEndedEmail()` in `subscriptionDeleted.js` will trigger a deletion notice email
    // SG email: "Membership ended"
    cancelUnpaidManualRenewals(sendInvoiceDocs),
    // (4) Send a feedback email after 7 + 5 days
    // SG Email: "Feedback after 5 days [from cancellation]"
    sendManualRenewalFeedbackEmails()
  ]);
};

/**
 * The goals of this is to send custom reminders to automatic-renewal users
 * who still have a cancelled, but still active, subscription that is in its last stages.
 *
 * We send an email 7 days before expiration, and one 2 days before.
 */
exports.handleAutomaticRenewals = async () => {
  const chargeAutomaticallyQuery = /** @type {Query<UserPrivate>} */ (
    db
      .collection('users-private')
      // In both cases, the subscription must be active still
      .where(statusKey, '==', 'active')
      .where(collectionMethodKey, '==', 'charge_automatically')
      // cancelAt must have a concrete timestamp in both cases,
      // which must be at most one week in the future, and not in the past
      .where(cancelAtKey, '>', lxHourStart.toSeconds())
      .where(cancelAtKey, '<=', lxHourStart.plus({ week: 1 }).toSeconds())
  );

  const docs = (await chargeAutomaticallyQuery.get()).docs;

  await Promise.all([
    sendCancelledRenewalReminderEmail7Days(docs),
    sendCancelledRenewalReminderEmail2Days(docs),
    sendAutomaticRenewalFeedbackEmails()
  ]);
};

/**
 * @param {FV2.ScheduledEvent} [_]
 * @returns {Promise<void>}
 */
// eslint-disable-next-line no-unused-vars
exports.handleRenewals = async (_) => {
  await Promise.all([this.handleManualRenewals(), this.handleAutomaticRenewals()]);
};

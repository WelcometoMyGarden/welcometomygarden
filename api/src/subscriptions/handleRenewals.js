const cancelUnpaidRenewals = require('./scheduled/cancelUnpaidRenewals');
const { db } = require('../firebase');
const { stripeSubscriptionKeys } = require('./constants');
const { oneYearAgoSecs } = require('../util/time');
const sendRenewalReminders = require('./scheduled/sendRenewalReminders');
const sendFeedbackEmails = require('./scheduled/sendFeedbackEmails');

const { statusKey, latestInvoiceStatusKey, startDateKey } = stripeSubscriptionKeys;

exports.handleRenewals = async () => {
  // Get all users with a subscription that expired, known from the status being "past_due"
  // and the start date being over a year ago (365 days).
  // NOTE: this may cause some inconsistencies depending on how Stripe sees a year
  //
  // Further filtering should be done to know exactly when the subscription expired.
  // We can't do that here because of compound query limitations
  // (e.g. can't combine an == condition with a != condition)
  // https://firebase.google.com/docs/firestore/query-data/queries#limitations
  const query = /** @type {Query<UserPrivate>} */ (
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

  const { docs } = await query.get();

  // Comments here document the renewal process that this function is a part of.
  // (1) the first renewal prompt email is sent when renewal invoice is created
  // for the new period (when the first period ended),
  // `sendSubscriptionRenewalEmail()` in `./stripeEventHandlers/invoiceCreated.js`
  // SG email: "Renewal 7 days before [cancellation]" (seen from the user's perspective)
  await Promise.all([
    // (2) Send renewal reminders 5 days after the period ended
    // SG email: "Renewal 2 days before [cancellation]"
    sendRenewalReminders(docs),
    // (3) Fully cancel the subscription in case of no renewal after 7 days
    // `sendSubscriptionEndedEmail()` in `subscriptionDeleted.js` will trigger a deletion notice email
    // SG email: "Membership ended"
    cancelUnpaidRenewals(docs),
    // (4) Send a feedback email after 7 + 5 days
    // SG Email: "Feedback after 5 days [from cancellation]"
    sendFeedbackEmails()
  ]);
};

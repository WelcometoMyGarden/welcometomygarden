const cancelUnpaidRenewals = require('./scheduled/cancelUnpaidRenewals');
const { db } = require('../firebase');
const { stripeSubscriptionKeys } = require('./constants');
const { oneYearAgoSecs } = require('../util/time');
const sendRenewalReminders = require('./scheduled/sendRenewalReminders');
const sendFeedbackEmails = require('./scheduled/sendFeedbackEmails');

const { statusKey, latestInvoiceStatusKey, startDateKey } = stripeSubscriptionKeys;

exports.handleRenewals = async () => {
  // Get all users with a subscription that expired, known from the status being "past_due"
  // and the start date being over a year ago (365 days)
  // NOTE: this may cause some inconsistencies depending on how Stripe sees a year
  //
  // Further filtering should be done to know exactly when the subscription expired.
  // We can't do that here because of compound query limitations.
  // https://firebase.google.com/docs/firestore/query-data/queries#limitations
  const query = db
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
    .where(startDateKey, '<=', oneYearAgoSecs());

  const { docs } = await query.get();

  await Promise.all([
    // Send renewal reminders after 5 days
    sendRenewalReminders(docs),
    // Fully cancel the subscription in case of no renewal after 7 days
    cancelUnpaidRenewals(docs),
    sendFeedbackEmails()
  ]);
};

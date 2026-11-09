const { usersPrivateCol } = require('../collections');
const { stripeSubscriptionKeys } = require('./constants');
const { lxHourStart } = require('../util/time');
const { sendAutomaticRenewalFeedbackEmails } = require('./scheduled/sendFeedbackEmails');
const {
  sendCancelledRenewalReminderEmail7Days,
  sendCancelledRenewalReminderEmail2Days
} = require('./scheduled/sendCancelledRenewalReminders');

const { statusKey, collectionMethodKey, cancelAtKey } = stripeSubscriptionKeys;

/**
 * The goals of this is to send custom reminders to automatic-renewal users
 * who still have a cancelled, but still active, subscription that is in its last stages.
 *
 * We send an email 7 days before expiration, and one 2 days before.
 */
exports.handleAutomaticRenewals = async () => {
  const chargeAutomaticallyQuery = usersPrivateCol()
    // In both cases, the subscription must be active still
    .where(statusKey, '==', 'active')
    .where(collectionMethodKey, '==', 'charge_automatically')
    // cancelAt must have a concrete timestamp in both cases,
    // which must be at most one week in the future, and not in the past
    .where(cancelAtKey, '>', lxHourStart.toSeconds())
    .where(cancelAtKey, '<=', lxHourStart.plus({ week: 1 }).toSeconds());

  const docs = (await chargeAutomaticallyQuery.get()).docs;

  await Promise.all([
    sendCancelledRenewalReminderEmail7Days(docs),
    sendCancelledRenewalReminderEmail2Days(docs),
    sendAutomaticRenewalFeedbackEmails()
  ]);
};

exports.handleRenewals = exports.handleAutomaticRenewals;

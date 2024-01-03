// @ts-check
const { db, auth } = require('../../firebase');
const { sendSubscriptionEndedEmail } = require('../../mail');
const removeUndefined = require('../../util/removeUndefined');
const { stripeSubscriptionKeys } = require('../constants');
const getFirebaseUserId = require('../getFirebaseUserId');

const { statusKey, cancelAtKey, canceledAtKey } = stripeSubscriptionKeys;

/**
 * When a subscription is deleted, that means it's over. We configure it
 * so it only gets deleted at a period's end.
 * This event should lead to the un-provisioning of a superfan.
 * TODO: maybe also a transactional email?
 * https://stripe.com/docs/billing/subscriptions/cancel#events
 * @param {*} event
 * @param {*} res
 */
module.exports = async (event, res) => {
  console.log('Handling customer.subscription.deleted');
  /** @type {import('stripe').Stripe.Subscription} */
  const subscription = event.data.object;
  const {
    customer,
    start_date: startDate,
    current_period_start: currentPeriodStart
  } = subscription;

  if (typeof customer !== 'string' && customer.deleted === true) {
    // The subscription was deleted because the customer was deleted. Do nothing!
    // Hopefully the deletion was initially triggered by a Firebase user deletion, which would
    // mean we already did the necessary cleanup using the Firestore hooks
    //
    // Note though, normally deletions happen as follows, and therefore won't enter this clause:
    // - event 1: the subscription of the customer is cancelled, with a string "customer" id
    // - event 2: immediately after, the customer itself is deleted
  } else if (typeof customer === 'string' || customer.id != null) {
    const customerId = typeof customer === 'string' ? customer : customer.id;
    const uid = await getFirebaseUserId(customerId);

    if (!uid) {
      console.warn(
        `Could not find a Firebase UID for customer ${customerId}, the customer is likely deleted.`
      );
    } else {
      // Ensure the user is UNmarked as a superfan.
      // (amounts to a pointless overwrite in case it was already set to true)
      const publicUserProfileDocRef = db.doc(`users/${uid}`);
      await publicUserProfileDocRef.update({ superfan: false });

      // Set the Firebase subscription status
      const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
      await privateUserProfileDocRef.update(
        removeUndefined({
          [statusKey]: subscription.status,
          [cancelAtKey]: subscription.cancel_at,
          [canceledAtKey]: subscription.canceled_at
        })
      );

      // If this cancellation occurs beyond the first period, it is likely a failed renewal
      // rather than an unpaid first invoice.
      // In this case, inform the user that their subscription has ended.
      if (currentPeriodStart !== startDate) {
        const user = await auth.getUser(uid);
        const publicUserProfileData = (await publicUserProfileDocRef.get()).data();
        const privateUserProfileData = (await privateUserProfileDocRef.get()).data();

        if (user.email) {
          await sendSubscriptionEndedEmail(
            user.email,
            publicUserProfileData?.firstName,
            privateUserProfileData?.communicationLanguage
          );
        }
      }
    }
  }

  return res.sendStatus(200);
};

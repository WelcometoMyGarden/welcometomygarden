const { setTimeout } = require('node:timers/promises');
const { logger } = require('firebase-functions/v2');
const { log, warn } = require('firebase-functions/logger');
const { db, auth } = require('../../firebase');
const { sendSubscriptionEndedEmail } = require('../../mail');
const removeUndefined = require('../../util/removeUndefined');
const { stripeSubscriptionKeys } = require('../constants');
const getFirebaseUserId = require('../getFirebaseUserId');
const { isWTMGSubscription } = require('./util');
const stripe = require('../stripe');

const { statusKey, cancelAtKey, canceledAtKey } = stripeSubscriptionKeys;

/**
 * When a subscription is deleted, that means it's over. We configure it
 * so it only gets deleted at a period's end.
 * This event should lead to the un-provisioning of a superfan.
 * https://stripe.com/docs/billing/subscriptions/cancel#events
 * @param {import('stripe').Stripe.Event} event
 * @param {*} res
 */
module.exports = async (event, res) => {
  log('Handling customer.subscription.deleted');
  /** @type {import('stripe').Stripe.Subscription} */
  // @ts-ignore
  const subscription = event.data.object;
  if (!isWTMGSubscription(subscription)) {
    log('Ignoring non-WTMG subscription');
    return res.sendStatus(200);
  }

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
      warn(
        `Could not find a Firebase UID for customer ${customerId}, the customer is likely deleted.`
      );
    } else {
      // Ensure the user is UNmarked as a superfan.
      // (amounts to a pointless overwrite in case it was already set to true)
      const publicUserProfileDocRef = db.doc(`users/${uid}`);
      await publicUserProfileDocRef.update({ superfan: false });

      const privateUserProfileDocRef = db.doc(`users-private/${uid}`);
      const syncDeletedSubscription = () =>
        privateUserProfileDocRef.update(
          removeUndefined({
            [statusKey]: subscription.status,
            [cancelAtKey]: subscription.cancel_at,
            [canceledAtKey]: subscription.canceled_at
          })
        );

      // Sync the Firebase subscription status of the deleted subscription, but only if no active sub can be found after two seconds.
      // //
      // These two seconds should avoid a race condition in the case where a new user comes back to an unpaid
      // invoice of a new sub after 1+ day, which our callable will then void, cancel the sub (this event) and then
      // immediately recreate a subscription. We don't listen to customer.subscription.created and order is not guaranteed,
      // so this event has in the past overriden the data of the new subscription.
      // Another way to avoid this issue is to not keep data of only 1 sub per user, but to record all the subs of a user by ID.
      await (
        await setTimeout(2000, async () => {
          // Search for active subscriptions (does not list canceled by default)
          const subs = (await stripe.subscriptions.list({ customer: customerId })).data;
          // Find a sub that was created 10 seconds around this event (regardless of its status)
          const recentNewSub = subs.find((sub) => Math.abs(sub.created - Date.now() / 1000) < 10);
          if (!recentNewSub) {
            await syncDeletedSubscription();
            logger.log(
              `Synced info from deleted sub ${subscription.id} to Firebase (no new recent subs were found)`
            );
          } else {
            logger.log(
              `Ignored Firebase info sync of deleted sub ${subscription.id} because a recently created new subscription ${recentNewSub.id} was found with status ${recentNewSub.status}`
            );
          }
        })
      )();

      // If this cancellation occurs beyond the first period, it is most likely not caused by an
      // unpaid first invoice (though we could aso check invoice.billing_reason and the metadata billing_reason_override to be more sure / TODO)
      // @ts-ignore
      const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice);

      // Inform the user that their subscription has ended...
      if (
        // ... on a lapsed, unpaid renewal of a 'send_invoice' subscription.
        // Here we need to specifically avoid sending this email on a .deleted event resulting from an unpaid first invoice.
        // (in that case, the billing reason would be subscription_create, or subscription_update, and the periods should be aligned)
        (subscription.collection_method === 'send_invoice' &&
          currentPeriodStart !== startDate &&
          latestInvoice.billing_reason === 'subscription_cycle') ||
        // ... in any case on a charge_automatically subscription.
        // There might only be one subscription_create invoice in this case, so we can not use the period_start & start_date comparison.
        // Note: with our current setup, subscriptions are *never* created with charge_automatically (they are only converted after the first payment)
        // So if no first payment comes in, none of the cases here will apply, which is what we want (no email).
        // TODO: this will probably also be sent after failed automatic payments in one year, do we want this?
        subscription.collection_method === 'charge_automatically'
      ) {
        const user = await auth.getUser(uid);
        const publicUserProfileData = (await publicUserProfileDocRef.get()).data();
        const privateUserProfileData = (await privateUserProfileDocRef.get()).data();

        if (user.email) {
          logger.log(
            'The deleted sub was a lapsed subscription, sending the subscriptionEnded email'
          );
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

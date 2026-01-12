const { setTimeout } = require('node:timers/promises');
const { logger } = require('firebase-functions/v2');
const { auth, getUserDocRefs, getUserDocRefsWithData } = require('../../firebase');
const {
  sendSubscriptionEndedEmail,
  sendSubscriptionAllPaymentsFailedEmail
} = require('../../mail');
const removeUndefined = require('../../util/removeUndefined');
const { stripeSubscriptionKeys } = require('../constants');
const getFirebaseUserId = require('../getFirebaseUserId');
const { isWTMGSubscription } = require('./util');
const stripe = require('../stripe');

const {
  statusKey,
  cancelAtKey,
  canceledAtKey,
  currentPeriodStartKey,
  currentPeriodEndKey,
  collectionMethodKey,
  latestInvoiceStatusKey
} = stripeSubscriptionKeys;

/**
 * When a subscription is deleted, that means it's over. We configure it
 * so it only gets deleted at a period's end.
 * This event should lead to the un-provisioning of a superfan.
 * https://stripe.com/docs/billing/subscriptions/cancel#events
 * @param {import('stripe').Stripe.CustomerSubscriptionDeletedEvent} event
 * @param {EResponse} res
 */
module.exports = async (event, res) => {
  logger.log('Handling customer.subscription.deleted', { eventId: event.id });
  const subscription = event.data.object;
  if (!isWTMGSubscription(subscription)) {
    logger.log('Ignoring non-WTMG subscription');
    return res.sendStatus(200);
  }

  const {
    customer,
    start_date: startDate,
    current_period_start: currentPeriodStart
  } = subscription;

  // Ignore some situations
  if (
    // The subscription was deleted because the customer was deleted. Do nothing!
    // Hopefully the deletion was initially triggered by a Firebase user deletion, which would
    // mean we already did the necessary cleanup using the Firestore hooks
    //
    // Note though, normally deletions happen as follows, and therefore won't enter this clause:
    // - event 1: the subscription of the customer is cancelled, with a string "customer" id
    // - event 2: immediately after, the customer itself is deleted
    (typeof customer !== 'string' && customer.deleted === true) ||
    // No customer id is available
    (typeof customer !== 'string' && customer?.id == null)
  ) {
    return res.sendStatus(200);
  }

  const customerId = typeof customer === 'string' ? customer : customer.id;
  const uid = await getFirebaseUserId(customerId);

  if (!uid) {
    logger.warn(
      `Could not find a Firebase UID for customer ${customerId}, the customer is likely deleted.`
    );
    return res.sendStatus(200);
  }

  const { publicUserProfileDocRef, privateUserProfileDocRef } = getUserDocRefs(uid);

  // Ensure the user is UNmarked as a superfan.
  // (amounts to a pointless overwrite in case it was already set to true)
  await publicUserProfileDocRef.update({ superfan: false });

  const latestInvoice = await stripe.invoices.retrieve(
    /** @type {string} */ (subscription.latest_invoice)
  );

  const syncDeletedSubscription = () =>
    privateUserProfileDocRef.update(
      removeUndefined({
        [statusKey]: subscription.status,
        [cancelAtKey]: subscription.cancel_at,
        [canceledAtKey]: subscription.canceled_at,
        // to be sure, include these too
        [currentPeriodStartKey]: subscription.current_period_start,
        [currentPeriodEndKey]: subscription.current_period_end,
        [collectionMethodKey]: subscription.collection_method,
        // This is used in the frontend, also important
        // Empirically, the invoice status changes right before Stripe takes
        // related actions on the subscription object (so the status here should be actual)
        [latestInvoiceStatusKey]: latestInvoice.status
      })
    );

  // Sync the Firebase subscription status of the deleted subscription, but only if no active sub can be found after two seconds.
  // //
  // These two seconds should avoid a race condition in the case where a new user comes back to an unpaid
  // invoice of a new sub after 1+ day, which our callable will then void, cancel the sub (this event) and then
  // immediately recreate a subscription. We don't listen to customer.subscription.created and order is not guaranteed,
  // so this event has in the past overriden the data of the new subscription.
  // Another way to avoid this issue is to not keep data of only 1 sub per user, but to record all the subs of a user by ID.
  try {
    // The below await awaits an expression that will evaluate to an async function in some time
    // The async function is also immediately called.
    await (
      await setTimeout(2000, async () => {
        // Search for active subscriptions (does not list canceled by default)
        // TODO: we should probably filter this down to WTMG subscriptions to be sure
        const subs = (await stripe.subscriptions.list({ customer: customerId })).data;
        // Find a sub that was created 10 seconds around this event (regardless of its status)
        const recentNewSub = subs.find((sub) => Math.abs(sub.created - Date.now() / 1000) < 10);
        if (!recentNewSub) {
          try {
            await syncDeletedSubscription();
          } catch (firestoreUpdateError) {
            if (
              typeof firestoreUpdateError !== 'undefined' &&
              firestoreUpdateError &&
              firestoreUpdateError.code === 5
            ) {
              // We empirically know that code 5 errors are of the following form:
              // Error: 5 NOT_FOUND: No document to update: projects/wtmg-dev/databases/(default)/documents/users/<some id>
              throw new Error('update-failed-not-found');
            } else {
              // Still throw the original error
              throw firestoreUpdateError;
            }
          }
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
  } catch (innerError) {
    if (innerError instanceof Error && innerError.message === 'update-failed-not-found') {
      logger.warn(
        `Could not sync info from a deleted sub because its connected users-private doc was deleted.` +
          `The user is probably deleted, aborting.`,
        { subscription: subscription.id, uid }
      );
      return res.sendStatus(200);
    }
    throw innerError;
  }

  // If this cancellation occurs beyond the first period, it is most likely not caused by an
  // unpaid first invoice (though we could aso check invoice.billing_reason and the metadata billing_reason_override to be more sure / TODO)

  // Do not send emails for deletions due to unpaid initial invoices (subscriptions that were never started)
  if (
    (latestInvoice.billing_reason === 'subscription_create' ||
      latestInvoice.metadata?.billing_reason_override === 'subscription_create') &&
    latestInvoice.status !== 'paid' &&
    subscription.cancellation_details.reason === 'payment_failed'
  ) {
    return res.sendStatus(200);
  }

  const { publicUserProfileData, privateUserProfileData } = await getUserDocRefsWithData(uid);
  const user = await auth.getUser(uid);
  if (!user.email) {
    logger.warn('User email not found');
    return res.sendStatus(200);
  }

  const emailParams = /** @type {const} */ ([
    user.email,
    publicUserProfileData?.firstName,
    privateUserProfileData?.communicationLanguage
  ]);

  // Inform the user that their subscription has ended *naturally*...
  if (
    // ... on a lapsed, unpaid renewal of a 'send_invoice' subscription.
    // Here we need to specifically avoid sending this email on a .deleted event resulting from an unpaid first invoice.
    // (in that case, the billing reason would be subscription_create, orsubscription_update, and the periods should be aligned)
    // NOTE: For send_invoice, 7 days after a renewal anchor, we first force-cancel the sub, then we force-void it's last invoice.
    // Empirically: this will lead to its `cancellation_details.reason` to be "cancellation_requested"
    (subscription.collection_method === 'send_invoice' &&
      currentPeriodStart !== startDate &&
      latestInvoice.billing_reason === 'subscription_cycle' &&
      subscription.cancellation_details.reason === 'cancellation_requested') ||
    // ... in the case of a charge_automatically subscription that ended after being cancelled by the user
    // NOTE: with our current setup, subscriptions are *never* created with charge_automatically (they are only converted after the first payment)
    // There might only be one subscription_create invoice in this case, so we can not use the period_start & start_date comparison.
    // So if no first payment comes in, none of the cases here will apply, which is what we want (no email).
    // TODO: this will probably also be sent after failed automatic payments in one year, do we want this?
    (subscription.collection_method === 'charge_automatically' &&
      subscription.cancellation_details.reason === 'cancellation_requested' &&
      latestInvoice.status === 'paid')
    // The sub's current period end is within 31 days of now.
    // This is an extra check that this is a "natural end" of the sub, i.e. that
    // no new invoice was created that ends in the future and is currently unpaid
    // NOTE: this check shouldn't be necessary, and it complicates test clock testing
    // && Math.abs(subscription.current_period_end - nowSecs()) < 31 * oneDaySecs)
  ) {
    logger.log(
      'The deleted sub was a lapsed send_invoice subscription renewal ' +
        'or previously canceled charge_automatically subscription, sending the subscriptionEnded email'
    );
    await sendSubscriptionEndedEmail(...emailParams);
  }
  // ... if this was a deletion due the failing of all payment attempt for an automatic renewal
  else if (
    subscription.collection_method === 'charge_automatically' &&
    latestInvoice.billing_reason === 'subscription_cycle' &&
    subscription.cancellation_details.reason === 'payment_failed' &&
    latestInvoice.status !== 'paid'
  ) {
    // then send an adapted email
    await sendSubscriptionAllPaymentsFailedEmail(...emailParams);
  }

  return res.sendStatus(200);
};

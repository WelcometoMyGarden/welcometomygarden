const fail = require('../util/fail');
const stripe = require('./stripe');
const { createStripeCustomer } = require('./createStripeCustomer');
const { stripeSubscriptionKeys } = require('./constants');
const removeUndefined = require('../util/removeUndefined');
const { db } = require('../firebase');
const { isWTMGSubscription } = require('./stripeEventHandlers/util');
const { oneDayAgo } = require('../util/time');

const {
  idKey,
  statusKey,
  priceIdKey,
  latestInvoiceStatusKey,
  currentPeriodStartKey,
  currentPeriodEndKey,
  startDateKey,
  cancelAtKey,
  canceledAtKey
} = stripeSubscriptionKeys;

/**
 * @typedef {import('stripe').Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodOptions.Bancontact.PreferredLanguage} PreferredLanguage
 */

/**
 * @param {string} customerId
 * @param {string} priceId
 * @param {DocumentReference} privateUserProfileDocRef
 * @param {string} locale
 * @returns
 */
const createNewSubscription = async (customerId, priceId, privateUserProfileDocRef, locale) => {
  // Check if we can set a preferred language for bancontact
  // https://stripe.com/docs/api/subscriptions/create#create_subscription-payment_settings-payment_method_options-bancontact-preferred_language
  /**
   * @type {PreferredLanguage | null}
   */
  let preferredBancontactLanguage = null;
  if (['en', 'de', 'nl', 'fr'].includes(locale)) {
    preferredBancontactLanguage = /** @type {PreferredLanguage} */ (locale);
  }

  // Create the subscription in Sripe
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price: priceId
      }
    ],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
      payment_method_options: {
        // https://stripe.com/docs/api/subscriptions/create#create_subscription-payment_settings-payment_method_options-bancontact-preferred_language
        bancontact: {
          preferred_language: preferredBancontactLanguage || 'en'
        }
      },
      // Make payment methods explicit, so both test mode & production can use different methods.
      // The template applies to both test mode and production.
      payment_method_types: ['bancontact', 'card', 'ideal', 'paypal', 'sepa_debit']
    },
    // When using 'send_invoice', invoices are not immediately finalized by Stripe (see below)
    // Here we can only expand the invoice, and not `latest_invoice.payment_intent`.
    expand: ['latest_invoice'],
    // The 'send_invoice' method is required for Bancontact, ideal, ...
    // https://stripe.com/docs/api/subscriptions/create#create_subscription-collection_method
    collection_method: 'send_invoice',
    days_until_due: 1
  });

  const getPaymentIntent = async () => {
    // Invoices are normally only finalized after one hour.
    // Manually finalize the invoice, which will create a new related PaymentIntent
    const openInvoice = await stripe.invoices.finalizeInvoice(subscription.latest_invoice.id, {
      expand: ['payment_intent']
    });

    // Update the payment intent in the locally stored subscription object
    subscription.latest_invoice.payment_intent = openInvoice.payment_intent;
  };

  // Set initial subscription parameters in Firebase
  const updateUserPrivateDocPromise = privateUserProfileDocRef.update(
    removeUndefined({
      [idKey]: subscription.id,
      // Take the price ID from the subscription object.
      // [one-off-invoice] Don't take the price ID from the invoice object, because if it was updated (first invoice voided),
      // The invoice line item will have a custom one-off product ID and price ID
      [priceIdKey]: subscription.items.data[0].price.id,
      [statusKey]: subscription.status,
      // Note: this will be out-of-date because we're not waiting for getPaymentIntent to perform this update
      // (trade-off with completion speed of the function)
      [latestInvoiceStatusKey]: subscription.latest_invoice.status,
      [currentPeriodStartKey]: subscription.current_period_start,
      [currentPeriodEndKey]: subscription.current_period_end,
      [startDateKey]: subscription.start_date,
      [cancelAtKey]: subscription.cancel_at,
      [canceledAtKey]: subscription.canceled_at
    })
  );

  await Promise.all([getPaymentIntent(), updateUserPrivateDocPromise]);

  // Will include the new PaymentIntent
  return subscription;
};

/**
 * Changes the price of a subscription with an unpaid first invoice (assumed input),
 * and returnts a subscription object with a finalized latest_invoice set to an invoice
 * of the full amount of the new price.
 * @param {import('stripe').Stripe.Subscription} existingSubscription
 * @param {import('stripe').Stripe.Price} priceObject
 * @param {DocumentReference} privateUserProfileDocRef
 */
const changeSubscriptionPrice = async (
  existingSubscription,
  priceObject,
  privateUserProfileDocRef
) => {
  const newPriceId = priceObject.id;
  // void the previous unpaid invoice. The upgrade will generate a new invoice,
  // and the old finalized one is not relevant anymore.
  await stripe.invoices.voidInvoice(existingSubscription.latest_invoice.id);

  // Also store the period it was for, for usage in the later new invoice
  const { period } = existingSubscription.latest_invoice.lines.data[0];

  // Step 2: perform an upgrade/downgrade of the sub with Stripe
  // https://stripe.com/docs/billing/subscriptions/upgrade-downgrade
  const proratedSubscription = await stripe.subscriptions.update(existingSubscription.id, {
    cancel_at_period_end: false,

    // > If you want the customer to immediately pay the price difference when switching
    // > to a more expensive subscription on the same billing cycle, you can set proration_behavior to 'always_invoice',
    // > which will calculate the proration and then immediately generate an invoice after making the switch.
    // > You can combine this behavior with pending updates so that the subscription is only updated if payment succeeds on the new invoice.
    // We're *NOT* using prorations_behavior: 'none'
    // > When prorations are disabled, customers are billed the full amount at the
    // > new price when the next invoice is generated.
    // https://stripe.com/docs/billing/subscriptions/prorations#disable-prorations
    // proration_behavior: 'none',
    // => does this mean that the customer doesn't have to pay extra for the current month?
    // Or will they be billed the current month fully when paying for the next month?
    // A bit unclear.
    proration_behavior: 'always_invoice',
    items: [
      {
        // Overwrite the existing item
        id: existingSubscription.items.data[0].id,
        // ... with the new price id
        price: newPriceId
      }
    ],
    // Expand, so we can immediately edit the invoice
    expand: ['latest_invoice']
  });
  const proratedInvoice = proratedSubscription.latest_invoice;
  // This will auto-generate a new invoice with prorations, based on the price previous invoice
  // The prorations assume that the previous invoice will still be paid (whether that one was voided or not!)
  // Remove all prorated line items
  const proratedInvoiceItems = await stripe.invoiceItems.list({
    invoice: proratedInvoice.id
  });
  await Promise.all(
    proratedInvoiceItems.data.map((invoiceItem) => stripe.invoiceItems.del(invoiceItem.id))
  );

  // Re-add a full subscription price for the current price to the "prorated" invoice
  await stripe.invoiceItems.create({
    // Note: these two are connected to an existing subscription.
    invoice: proratedInvoice.id,
    // Required
    customer: existingSubscription.customer,
    subscription: existingSubscription.id,
    // Reuse the same period as the original invoice
    period,

    // price: priceId,
    // Can't do this, it's not allowed to directly set the recurring priceId
    // Unhandled error StripeInvalidRequestError: The price specified is set to `type=recurring` but this field only accepts prices with `type=one_time`.
    // TODO: add a description. Now it says: "No description" - however, description is a part of a product
    // NOTE: This results in a **one-off product and price ID** to be created just for this invoice
    //  TODO: this leads to annoying inconsistencies in transaction reporting. We should consider fully cancelling and recreating one,
    //  rather than voiding the first invoice of the same subscription. Pros/cons?
    unit_amount: priceObject.unit_amount,
    quantity: 1,
    currency: priceObject.currency
  });

  // Mark the invoice as a special changed invoice, so later events can know what happened here.
  await stripe.invoices.update(proratedInvoice.id, {
    metadata: {
      // the actual proratedInvoice.billing_reason will be 'subscription_update'
      billing_reason_override: 'subscription_create'
    }
  });

  // Finalize the changed invoice, ensure a payment intent exists
  const finalizedProratedInvoice = await stripe.invoices.finalizeInvoice(proratedInvoice.id, {
    expand: ['payment_intent']
  });

  // Overwrite the the latest invoice/payment intent in the subscription to return
  proratedSubscription.latest_invoice = finalizedProratedInvoice;

  // Save the updated info in Firebase
  await privateUserProfileDocRef.update(
    removeUndefined({
      // Get the new price id from the source of truth, it should be equal to priceObject.id though.
      // NOTE: don't get it from the invoice, see other note [one-off-invoice]
      [priceIdKey]: proratedSubscription.items.data[0].price.id,
      [statusKey]: proratedSubscription.status,
      [latestInvoiceStatusKey]: proratedSubscription.latest_invoice.status
      // id, startDate, currentPeriodStart & currentPeriodEnd should not have altered
    })
  );

  return proratedSubscription;
};

/**
 *
 * @param {FV2.CallableRequest<{priceId: string, locale:string}>} request
 * @returns
 */
exports.createOrRetrieveUnpaidSubscription = async (request) => {
  if (!request.auth) {
    fail('unauthenticated');
  }

  const { priceId, locale } = request.data;

  if (
    typeof priceId !== 'string' ||
    // Allow undefined locales, or a string locale
    !(locale === null || locale === undefined || typeof locale === 'string')
  ) {
    fail('invalid-argument');
  }

  const { uid } = request.auth;

  // Reused later, initialized concurrently below
  let requestedPrice;

  const fetchStripePrice = async () => {
    try {
      // Validate the price by checking if it exists in Stripe
      // Store the object for later reference, it might be needed.
      requestedPrice = await stripe.prices.retrieve(priceId);
    } catch (e) {
      console.error(`An invalid price_id was supplied`);
      fail('invalid-argument');
    }
  };

  // Reused later, initialized concurrently below
  let customerId;
  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);

  const fetchUserData = async () => {
    const privateUserProfileData = (await privateUserProfileDocRef.get()).data();
    if (!privateUserProfileData.stripeCustomerId) {
      console.info(`User ${uid} does not yet have a Stripe customer linked to it, creating it.`);
      const { id: createdCustomerId } = await createStripeCustomer(null, request);
      customerId = createdCustomerId;
    } else {
      customerId = privateUserProfileData.stripeCustomerId;
    }
  };

  // Run initial initializers concurrently
  await Promise.all([fetchStripePrice(), fetchUserData()]);

  const existingSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    // send_invoice subs are always activated when they are created
    // if they are not active anymore, they are probably past_due or something else

    // Find existing subscriptions from Stripe
    // TODO: a failed payment moves the sub status to 'past_due' afaics - what does that mean for this?
    // Disabling status: 'active' for now
    // status: 'active',
    expand: ['data.latest_invoice.payment_intent']
  });

  // A variable to hold the subscription to be retrieved or created
  let subscription;

  // Find an active WTMG subscription (if any) that is already paid
  const existingValidSubscription = existingSubscriptions.data.find((sub) => {
    return (
      isWTMGSubscription(sub) &&
      sub.status === 'active' &&
      sub.latest_invoice != null &&
      typeof sub.latest_invoice !== 'string' &&
      sub.latest_invoice.status === 'paid'
    );
  });

  // Don't create a new subscription
  if (existingValidSubscription) {
    console.warn(
      'Tried to recreate an already-active & paid subscription. Something probably went wrong with the Firebase sync, because the client is trying this invalid request.'
    );
    fail('already-exists');
  }

  // Find the first (if any) WTMG subscription that has an open invoice that we should process futher.
  const existingIncompleteSubscription = existingSubscriptions.data.find((sub) => {
    // Only retrieve subscriptions with a latest invoice that wasn't paid yet
    // https://stripe.com/docs/invoicing/overview#workflow-overview
    const hasOpenInvoice =
      typeof sub.latest_invoice === 'object' &&
      sub.latest_invoice != null &&
      sub.latest_invoice.status === 'open';

    // Has a payment intent that can we send back to the client (whatever status it has)
    // https://stripe.com/docs/payments/intents#intent-statuses
    const hasPaymentIntent =
      hasOpenInvoice &&
      typeof sub.latest_invoice.payment_intent === 'object' &&
      sub.latest_invoice.payment_intent != null;

    return isWTMGSubscription(sub) && hasOpenInvoice && hasPaymentIntent;
  });

  if (existingIncompleteSubscription) {
    if (existingIncompleteSubscription.start_date < oneDayAgo()) {
      // If this subscription was created more than 24 hours ago (user was on payment page, but didn't pay),
      // DO NOT try to pay it, but cancel it and create a new one, so that the sub start date can only be max. 24h before
      // the actual payment (and not earlier).
      //
      // Void the invoice explicitly, to avoid its expiry/state transition (-> uncollectible) triggering an unexpected side-effect later on
      const voidExistingInvoice = async () =>
        stripe.invoices.voidInvoice(existingIncompleteSubscription.latest_invoice.id);
      // Cancel the subscription explicitly
      const cancelExistingSubObject = async () =>
        stripe.subscriptions.cancel(existingIncompleteSubscription.id);

      // Perform cancellation-related actions concurrently
      await Promise.all([voidExistingInvoice(), cancelExistingSubObject()]);

      // Create a new subscription to return for payment
      // NOTE: this can not be executed concurrently, because this might lead to a race condition where
      // the webhook events triggered by cancellation overwrite data that was just inserted by the new subscription
      // Sequentially, it might still be possible (depends on how Stripe functions), but it's less likely.
      // NOTE 2: this gives us price-changing for free
      // TODO: we should consider making this the default options for price-changing within 24 hours, too
      subscription = await createNewSubscription(
        customerId,
        priceId,
        privateUserProfileDocRef,
        locale
      );
    } else if (priceId !== existingIncompleteSubscription.items.data[0].price.id) {
      // TODO: pending/processing SEPA Debit payments will also have an "open" status invoice, and "processing" status PaymentIntent
      // While the front-end tries to prevent it, there could be cases where we have retrieved a pending payment invoice,
      // while the user tried to create one of another price. changeSubscriptionPrice() then would be destructive.
      // We should probably disallow changing the subscription price of a pending payment invoice, or create a second, actually prorated invoice?
      //
      // If we're in the 24h window, and the price id requested is different to the current subscription's price, then change the subscription
      subscription = await changeSubscriptionPrice(
        existingIncompleteSubscription,
        requestedPrice,
        privateUserProfileDocRef
      );
    } else {
      // If we're in the 24h window, and the price id was the same, return the payment intent of the existing unpaid invoice
      subscription = existingIncompleteSubscription;
    }
  } else {
    subscription = await createNewSubscription(
      customerId,
      priceId,
      privateUserProfileDocRef,
      locale
    );
  }

  return {
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret
  };
};

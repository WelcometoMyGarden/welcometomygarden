const fail = require('../util/fail');
const stripe = require('./stripe');
const { createStripeCustomer } = require('./createStripeCustomer');
const { stripeSubscriptionKeys } = require('./constants');
const removeUndefined = require('../util/removeUndefined');
const { usersPrivateDoc } = require('../collections');
const { isWTMGSubscription } = require('./stripeEventHandlers/util');
const { getSubscriptionPeriod, getInvoicePaymentIntent } = require('./basilCompat');
const { oneDayAgo } = require('../util/time');
const { logger } = require('firebase-functions');

const {
  idKey,
  statusKey,
  priceIdKey,
  latestInvoiceStatusKey,
  currentPeriodStartKey,
  currentPeriodEndKey,
  startDateKey,
  cancelAtKey,
  canceledAtKey,
  collectionMethodKey
} = stripeSubscriptionKeys;

/**
 * @typedef {Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodOptions.Bancontact.PreferredLanguage} PreferredLanguage
 */

/**
 * Makes sure a payment intent is generated and set up for future usage.
 * This is a preparation for switching collection_method to charge_automatically, which will happen immediately after the first payment (see invoice.paid)
 * Returns the finalized invoice and its PaymentIntent.
 * @param {Stripe.Subscription} subscription
 * @returns {Promise<{ invoice: Stripe.Invoice, paymentIntent: Stripe.PaymentIntent }>}
 */
const generatePaymentIntent = async (subscription) => {
  // Invoices are normally only finalized after one hour.
  // Manually finalize the invoice, which will create a new related PaymentIntent
  const invoiceId = /** @type {Stripe.Invoice} */ (subscription.latest_invoice).id;

  // TODO: can this be expanded?
  const openInvoice = await stripe.invoices.finalizeInvoice(invoiceId);

  // Resolve the PaymentIntent via the new invoice.payments structure (Basil).
  const existingPaymentIntent = await getInvoicePaymentIntent(openInvoice.id);
  if (!existingPaymentIntent) {
    throw new Error(`Could not find a PaymentIntent for invoice ${openInvoice.id}`);
  }

  // Automatic renewals: collect payment with the aim of future charges as well
  // This influences the copy shown in Payment Elements.
  // In case of Bancontact/iDEAL, the payment method details saved are SEPA details
  // Note: I don't think we can use the new invoice.confirmation_secret here, because this update needs to happen regardless
  // https://docs.stripe.com/api/invoices/object?api-version=2025-03-31.basil#invoice_object-confirmation_secret
  const paymentIntent = await stripe.paymentIntents.update(existingPaymentIntent.id, {
    setup_future_usage: 'off_session'
  });

  return { invoice: openInvoice, paymentIntent };
};

/**
 * @param {string} customerId
 * @param {string} priceId
 * @param {DocumentReference} privateUserProfileDocRef
 * @param {string} locale may or may not be a supported locale
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

  // Create the subscription in Stripe
  const subscription = await stripe.subscriptions.create({
    // We don't need or use the flexible logic at this point, and this explicit setting keep behavior consistent
    // between new subscriptions and existing ones, without having to migrate them.
    billing_mode: { type: 'classic' },
    customer: customerId,
    items: [
      {
        price: priceId
      }
    ],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      // TODO: I'm not sure if this is/was wanted here.
      save_default_payment_method: 'on_subscription',
      payment_method_options: {
        // https://stripe.com/docs/api/subscriptions/create#create_subscription-payment_settings-payment_method_options-bancontact-preferred_language
        bancontact: {
          preferred_language: preferredBancontactLanguage || 'en'
        }
      },
      // Make payment methods explicit, so both test mode & production can use different methods.
      // The template applies to both test mode and production.
      // payment_method_types: ['bancontact', 'card', 'ideal', 'paypal', 'sepa_debit']
      payment_method_types: ['bancontact', 'card', 'ideal', 'sepa_debit']
    },
    // When using 'send_invoice', invoices are not immediately finalized by Stripe (see below)
    // Before Basil, we empirically determined that we can only expand the invoice here, not further payment_intent properties
    // (those are anyway pushed another layer down via the Invoice Payment array).
    expand: ['latest_invoice'],
    // Since mid Jan., 2025, we're converting all subscriptions (renewals or new payments) to charge_automatically
    // - Many users created before mid Jan. 2025 are on 'send_invoice' until they pay their next invoice.
    // - The 'send_invoice' method is REQUIRED to show Bancontact & iDEAL as payment options, and hence we
    // still need to start all new subs on 'send_invoice' too. However, these will be converted immediately
    // into 'charge_automatically' with derived SEPA mandates as soon as the first invoice payment comes in, see invoicePaid.js
    // https://stripe.com/docs/api/subscriptions/create#create_subscription-collection_method
    collection_method: 'send_invoice',
    days_until_due: 1
  });

  const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriod(subscription);

  // Set initial subscription parameters in Firebase
  const updateUserPrivateDocPromise = privateUserProfileDocRef.update(
    removeUndefined({
      [idKey]: subscription.id,
      // Take the price ID from the subscription object, it is the source of truth.
      [priceIdKey]: subscription.items.data[0].price.id,
      [statusKey]: subscription.status,
      // NOTE: [insert-payment-intent-speedhack]: the latestInvoiceStatus be out-of-date (with status === 'draft', while it should be 'open')
      // because we're NOT waiting for insertPaymentIntent to finish to perform this userPrivate doc update
      // This allows both requests to work concurrently rather than serially, shaving off a bit of time in this long-running operation.
      [latestInvoiceStatusKey]: /** @type {Stripe.Invoice} */ (subscription.latest_invoice).status,
      [currentPeriodStartKey]: currentPeriodStart,
      [currentPeriodEndKey]: currentPeriodEnd,
      [startDateKey]: subscription.start_date,
      [cancelAtKey]: subscription.cancel_at,
      [canceledAtKey]: subscription.canceled_at,
      [collectionMethodKey]: subscription.collection_method
    })
  );

  const [{ paymentIntent }] = await Promise.all([
    generatePaymentIntent(subscription),
    updateUserPrivateDocPromise
  ]);

  // The PaymentIntent's client_secret can still be used to confirm an invoice
  // PaymentIntent on the frontend with the Payment Element.
  return { subscription, clientSecret: paymentIntent.client_secret };
};

/**
 * Changes the price of a subscription with an unpaid first invoice (assumed input),
 * and returns a subscription object with a finalized latest_invoice for the full amount
 * of the new price.
 *
 * NOTE: this resets the billing cycle anchor, so the subscription's current period starts
 * at the moment of the change, while its start_date stays the original creation time.
 * The two can differ by up to 24 hours (beyond that, the sub is recreated instead), so
 * a mismatch between them does not by itself imply a renewal period. See isRenewalPeriod().
 * @param {Stripe.Subscription} existingSubscription
 * @param {Stripe.Price} priceObject
 * @param {DocumentReference} privateUserProfileDocRef
 */
const changeSubscriptionPrice = async (
  existingSubscription,
  priceObject,
  privateUserProfileDocRef
) => {
  const existingInvoice = /** @type {Stripe.Invoice} */ (existingSubscription.latest_invoice);
  // Void the previous unpaid invoice, so that it can't be paid anymore.
  await stripe.invoices.voidInvoice(existingInvoice.id);

  // Switch to the new price and start a new billing period right now.
  // Stripe immediately generates an invoice for the full amount of the new price, whose line
  // item references the new (recurring) WTMG price. With proration disabled, no credit
  // is given for the voided invoice.
  // https://docs.stripe.com/billing/subscriptions/billing-cycle
  const updatedSubscription = await stripe.subscriptions.update(existingSubscription.id, {
    cancel_at_period_end: false,
    items: [
      {
        // Overwrite the existing item
        id: existingSubscription.items.data[0].id,
        // ... with the new price id
        price: priceObject.id
      }
    ],
    billing_cycle_anchor: { type: 'now' },
    proration_behavior: 'none',
    expand: ['latest_invoice']
  });
  const newInvoice = /** @type {Stripe.Invoice} */ (updatedSubscription.latest_invoice);

  // Mark the invoice as a special changed invoice, so later events can know what happened here.
  await stripe.invoices.update(newInvoice.id, {
    metadata: {
      // the actual newInvoice.billing_reason will be 'subscription_update'
      billing_reason_override: 'subscription_create'
    }
  });

  const { currentPeriodStart, currentPeriodEnd } = getSubscriptionPeriod(updatedSubscription);

  // Save the updated info in Firebase
  const [{ paymentIntent }] = await Promise.all([
    generatePaymentIntent(updatedSubscription),
    privateUserProfileDocRef.update(
      removeUndefined({
        // Get the new price id from the source of truth, it should be equal to priceObject.id though.
        [priceIdKey]: updatedSubscription.items.data[0].price.id,
        [statusKey]: updatedSubscription.status,
        // NOTE: this will be outdated, see [insert-payment-intent-speedhack]
        [latestInvoiceStatusKey]: newInvoice.status,
        [currentPeriodStartKey]: currentPeriodStart,
        [currentPeriodEndKey]: currentPeriodEnd
        // id & startDate should not have altered
      })
    )
  ]);

  return { subscription: updatedSubscription, clientSecret: paymentIntent.client_secret };
};

/**
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
    !(locale == null || typeof locale === 'string')
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
      logger.error(`An invalid price_id was supplied: ${priceId}`);
      fail('invalid-argument');
    }
  };

  // Reused later, initialized concurrently below
  let customerId;
  const privateUserProfileDocRef = usersPrivateDoc(uid);

  const fetchUserData = async () => {
    const privateUserProfileData = (await privateUserProfileDocRef.get()).data();
    if (!privateUserProfileData.stripeCustomerId) {
      logger.info(`User ${uid} does not yet have a Stripe customer linked to it, creating it.`);
      const { id: createdCustomerId } = await createStripeCustomer({
        data: { locale },
        auth: request.auth
      });
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
    // NOTE: this behavior will change
    // Disabling status: 'active' for now
    // status: 'active',
    // Basil: `invoice.payment_intent` was removed; PaymentIntents are now reached
    // through `invoice.payments[].payment.payment_intent`.
    // Stripe's 4-level expand limit means we can only go as deep as `payments` here,
    // what we actuallly need is `data.latest_invoice.payments.data.payment_intent`.
    // To read the PaymentIntent itself we fetch it separately via getInvoicePaymentIntent.
    expand: ['data.latest_invoice.payments']
  });

  // Holds the subscription to be retrieved or created plus the PaymentIntent
  // client_secret to confirm on the frontend.
  /** @type {{ subscription: Stripe.Subscription, clientSecret: string | null }} */
  let result;

  // Find an active WTMG subscription (if any) that is already paid
  const existingValidSubscription = existingSubscriptions.data.find((sub) => {
    return (
      isWTMGSubscription(sub) &&
      sub.latest_invoice != null &&
      typeof sub.latest_invoice !== 'string' &&
      sub.latest_invoice.status === 'paid'
    );
  });

  if (existingValidSubscription && existingValidSubscription.status !== 'active') {
    logger.error('Weird race condition found, sub is not active while latest invoice is paid', {
      sub: existingValidSubscription.id,
      sub_status: existingValidSubscription.status,
      inv: /** @type {Stripe.Invoice} */ (existingValidSubscription.latest_invoice).id
    });
  }

  // Don't create a new subscription
  if (existingValidSubscription) {
    logger.warn(
      'Tried to recreate an already-active & paid subscription. Something probably went wrong with the Firebase sync, because the client is trying this invalid request.',
      { sub: existingValidSubscription.id }
    );
    fail('already-exists');
  }

  // Find the first (if any) WTMG subscription that has an open invoice that we should process futher.
  const existingIncompleteSubscription = existingSubscriptions.data.find((sub) => {
    // Only retrieve subscriptions with a latest invoice that wasn't paid yet
    // https://stripe.com/docs/invoicing/overview#workflow-overview
    const latestInvoice = typeof sub.latest_invoice === 'object' ? sub.latest_invoice : null;
    const hasOpenInvoice = latestInvoice?.status === 'open';

    // Has an InvoicePayment that points to a PaymentIntent we can send back to
    // the client (whatever status it has).
    // https://stripe.com/docs/payments/intents#intent-statuses
    // Basil: the link is via the expanded invoice.payments list; payment.payment_intent
    // is just a string id at this depth (we did not deep-expand it).
    const hasInvoicePaymentIntent = latestInvoice?.payments?.data?.some(
      (p) => p.payment?.type === 'payment_intent' && p.payment.payment_intent != null
    );

    if (isWTMGSubscription(sub) && hasOpenInvoice && !hasInvoicePaymentIntent) {
      logger.error('Unexpected situation, incomplete sub has open invoice but no payment intent', {
        sub: sub.id,
        inv: latestInvoice?.id
      });
    }

    return isWTMGSubscription(sub) && hasOpenInvoice && hasInvoicePaymentIntent;
  });

  if (existingIncompleteSubscription) {
    if (existingIncompleteSubscription.start_date < oneDayAgo()) {
      // If this subscription was created more than 24 hours ago (user was on payment page, but didn't pay),
      // DO NOT try to pay it, but cancel it and create a new one, so that the sub start date can only be max. 24h before
      // the actual payment (and not earlier).
      //
      // Void the invoice explicitly, to avoid its expiry/state transition (-> uncollectible) triggering an unexpected side-effect later on
      const voidExistingInvoice = async () =>
        stripe.invoices.voidInvoice(
          /** @type {Stripe.Invoice} */ (existingIncompleteSubscription.latest_invoice).id
        );
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
      result = await createNewSubscription(customerId, priceId, privateUserProfileDocRef, locale);
    } else if (priceId !== existingIncompleteSubscription.items.data[0].price.id) {
      // TODO: pending/processing SEPA Debit payments will also have an "open" status invoice, and "processing" status PaymentIntent
      // While the front-end tries to prevent it, there could be cases where we have retrieved a pending payment invoice,
      // while the user tried to create one of another price. changeSubscriptionPrice() then would be destructive.
      // We should probably disallow changing the subscription price of a pending payment invoice, or create a second, actually prorated invoice?
      //
      // If we're in the 24h window, and the price id requested is different to the current subscription's price, then change the subscription
      result = await changeSubscriptionPrice(
        existingIncompleteSubscription,
        requestedPrice,
        privateUserProfileDocRef
      );
    } else {
      // If we're in the 24h window, and the price id was the same, return the payment intent of the existing unpaid invoice.
      // The PaymentIntent isn't expanded on the listed invoice (depth limit),
      // so resolve it via the helper, which expands invoice.payments.data.payment.payment_intent in a fresh retrieve.
      const existingInvoice = /** @type {Stripe.Invoice} */ (
        existingIncompleteSubscription.latest_invoice
      );
      const paymentIntent = await getInvoicePaymentIntent(existingInvoice);
      result = {
        subscription: existingIncompleteSubscription,
        clientSecret: paymentIntent?.client_secret ?? null
      };
    }
  } else {
    result = await createNewSubscription(customerId, priceId, privateUserProfileDocRef, locale);
  }

  return {
    subscriptionId: result.subscription.id,
    clientSecret: result.clientSecret
  };
};

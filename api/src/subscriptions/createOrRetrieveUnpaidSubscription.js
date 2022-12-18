// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { getFirestore } = require('firebase-admin/firestore');
const fail = require('../util/fail');
const stripe = require('./stripe');
const { createStripeCustomer } = require('./createStripeCustomer');

const db = getFirestore();

async function createNewSubscription(customerId, priceId, privateUserProfileDocRef) {
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
      save_default_payment_method: 'on_subscription'
    },
    // When using 'send_invoice', invoices are not immediately finalized by Stripe (see below)
    // Here we can only expand the invoice, and not `latest_invoice.payment_intent`.
    expand: ['latest_invoice'],
    // The 'send_invoice' method is required for Bancontact, ideal, ...
    // https://stripe.com/docs/api/subscriptions/create#create_subscription-collection_method
    collection_method: 'send_invoice',
    days_until_due: 1
  });

  // Invoices are normally only finalized after one hour.
  // Manually finalize the invoice, which will create a new related PaymentIntent
  const openInvoice = await stripe.invoices.finalizeInvoice(subscription.latest_invoice.id, {
    expand: ['payment_intent']
  });

  // Update the payment intent in the locally stored subscription object
  subscription.latest_invoice.payment_intent = openInvoice.payment_intent;

  // Set initial subscription parameters in Firebase
  await privateUserProfileDocRef.update({
    'stripeSubscription.id': subscription.id,
    'stripeSubscription.priceId': subscription.items.data[0].price.id,
    'stripeSubscription.status': subscription.status,
    'stripeSubscription.latestInvoiceStatus': subscription.latest_invoice.status
  });
  return subscription;
}

exports.createOrRetrieveUnpaidSubscription = async ({ priceId }, context) => {
  if (!context.auth) {
    fail('unauthenticated');
  }
  if (typeof priceId !== 'string') {
    fail('invalid-argument');
  }
  const { uid } = context.auth;

  let priceObject;
  try {
    // Validate the price by checking if it exists in Stripe
    priceObject = await stripe.prices.retrieve(priceId);
  } catch (e) {
    console.error(`An invalid price_id was supplied`);
    fail('invalid-argument');
  }

  let customerId;
  const privateUserProfileDocRef = db.doc(`users-private/${uid}`);

  const privateUserProfileData = await (await privateUserProfileDocRef.get()).data();
  if (!privateUserProfileData.stripeCustomerId) {
    console.info(`User ${uid} does not yet have a Stripe customer linked to it, creating it.`);
    const { id: createdCustomerId } = await createStripeCustomer(null, context);
    customerId = createdCustomerId;
  } else {
    customerId = privateUserProfileData.stripeCustomerId;
  }

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

  // Find an active subscription (if any) that is already paid
  const existingValidSubscription = existingSubscriptions.data.find((sub) => {
    return (
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

  // Find the first (if any) subscription that has an open invoice that we should process futher.
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

    return hasOpenInvoice && hasPaymentIntent;
  });

  if (existingIncompleteSubscription) {
    subscription = existingIncompleteSubscription;

    if (priceId !== subscription.items.data[0].price.id) {
      // TODO: this behavior should only possibly apply when the unpaid invoice is one
      // that is an original subscription invoice - not coincidentally another cycle's invoice.
      // If the price id requested is different, then change the subscription
      // https://stripe.com/docs/billing/subscriptions/upgrade-downgrade

      // Step 1: void the previous unpaid invoice. The upgrade will generate a new invoice,
      // and the old finalized one is not relevant anymore.
      await stripe.invoices.voidInvoice(subscription.latest_invoice.id);

      // Also store the period it was for, for usage in the later new invoice
      const { period } = subscription.latest_invoice.lines.data[0];

      // Step 2: perform an upgrade/downgrade of the sub with Stripe
      const proratedSubscription = await stripe.subscriptions.update(subscription.id, {
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
            id: subscription.items.data[0].id,
            // ... with the new price id
            price: priceId
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
        customer: subscription.customer,
        subscription: subscription.id,
        // Reuse the same period as the original invoice
        period,

        // price: priceId,
        // Can't do this, it's not allowed to directly set the recurring priceId
        // Unhandled error StripeInvalidRequestError: The price specified is set to `type=recurring` but this field only accepts prices with `type=one_time`.

        // {"severity":"ERROR","message":"Unhandled error StripeInvalidRequestError: You must specify either an amount or a quantity and unit_amount, but not all three
        // actually: amount might not exist on the above
        // amount: priceObject.amount
        // TODO: add a description. Now it says: "No description"
        unit_amount: priceObject.unit_amount,
        quantity: 1,
        currency: priceObject.currency
      });

      // Finalize the changed invoice, ensure a payment intent exists
      const finalizedProratedInvoice = await stripe.invoices.finalizeInvoice(proratedInvoice.id, {
        expand: ['payment_intent']
      });

      // Overwrite the the latest invoice/payment intent in the subscription to return
      subscription.latest_invoice = finalizedProratedInvoice;
    }
  } else {
    subscription = await createNewSubscription(customerId, priceId, privateUserProfileDocRef);
  }

  return {
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret
  };
};

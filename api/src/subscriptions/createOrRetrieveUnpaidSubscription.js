// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { getFirestore } = require('firebase-admin/firestore');
const fail = require('../util/fail');
const stripe = require('./stripe');
const { createStripeCustomer } = require('./createStripeCustomer');

const db = getFirestore();

exports.createOrRetrieveUnpaidSubscription = async ({ priceId }, context) => {
  if (!context.auth) {
    fail('unauthenticated');
  }
  if (typeof priceId !== 'string') {
    fail('invalid-argument');
  }
  const { uid } = context.auth;

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

  // Find existing subscriptions from Stripe
  // TODO: a failed payment moves the sub status to overdue afaics - what does that mean for this?
  const existingSubscriptions = await stripe.subscriptions.list({
    customer: customerId,
    // send_invoice subs are always activated when they are created
    // if they are not active anymore, they are probably past_due or something else
    status: 'active',
    expand: ['data.latest_invoice.payment_intent']
  });

  let subscription;

  // Find an active subscription (if any) that is already paid
  const existingValidSubscription = existingSubscriptions.data.find((sub) => {
    return (
      sub.latest_invoice != null &&
      typeof sub.latest_invoice !== 'string' &&
      sub.latest_invoice.status === 'paid'
    );
  });

  // Don't create a new subscription
  if (existingValidSubscription) {
    fail('already-exists');
  }

  // Find the first (if any) subscription that has an open invoice that we should process futher.
  const existingIncompleteSubscription = existingSubscriptions.data.find((sub) => {
    // Only retrieve subscriptions with a latest invoice that wasn't paid yet
    // https://stripe.com/docs/invoicing/overview#workflow-overview
    const hasOpenInvoice =
      typeof sub.latest_invoice === 'object' && sub.latest_invoice.status === 'open';

    // Has a payment intent that can we send back to the client (whatever status it has)
    // https://stripe.com/docs/payments/intents#intent-statuses
    const hasPaymentIntent =
      hasOpenInvoice && typeof sub.latest_invoice.payment_intent === 'object';

    return hasOpenInvoice && hasPaymentIntent;
  });

  if (existingIncompleteSubscription) {
    subscription = existingIncompleteSubscription;
  } else {
    subscription = await stripe.subscriptions.create({
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
      // This method is required for Bancontact, ideal, ...
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
  }

  return {
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret
  };
};

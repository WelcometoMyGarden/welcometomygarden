// Name of the Stripe info object in a Firebase `users-private` doc
const stripeSubscriptionObjectKey = 'stripeSubscription';
exports.stripeObject = stripeSubscriptionObjectKey;

const stripeSubscriptionSubKeys = [
  'latestInvoiceStatus',
  'priceId',
  'status',
  'id',
  'currentPeriodStart',
  'currentPeriodEnd',
  // https://stripe.com/docs/api/subscriptions/object#subscription_object-start_date
  'startDate',
  // https://stripe.com/docs/api/subscriptions/object#subscription_object-cancel_at
  // An existent `cancel_at` implies `cancel_at_period_end` being true https://stripe.com/docs/api/subscriptions/object#subscription_object-cancel_at_period_end
  // However, a a forced immediate cancelation after a cancel_at_period_end update sets cancelAt to null
  'cancelAt',
  // https://stripe.com/docs/api/subscriptions/object#subscription_object-canceled_at
  // Careful: if cancelAt is set to a date beyond canceledAt, canceledAt means that
  // the user requested the subscription to be canceled at this state.
  'canceledAt',
  // Whether the payment is approved, but still proccessing. To support immediately activating subscriptions for SEPA Debit & other delayed notification payment methods.
  // See paymentIntentProcessing
  'paymentProcessing',
  // Stripe-hosted invoice link
  'renewalInvoiceLink'
];

// Keys that can be used in an .update command to a Firebase `users-private` doc
exports.stripeSubscriptionKeys = Object.fromEntries(
  stripeSubscriptionSubKeys.map((subKey) => [
    `${subKey}Key`,
    `${stripeSubscriptionObjectKey}.${subKey}`
  ])
);

type StripeSubscriptionKeys = readonly [
  'latestInvoiceStatus',
  'priceId',
  'status',
  'id',
  'currentPeriodStart',
  'currentPeriodEnd',
  'startDate',
  'cancelAt',
  'canceledAt',
  'paymentProcessing',
  'renewalInvoiceLink'
];
type StripeUpdateKey = StripeSubscriptionKeys[number];
type StripeUpdateKeysWithKeySuffix = `${StripeUpdateKey}Key`;
type StripeObjectUpdateKeys = { [key in StripeUpdateKeysWithKeySuffix]: string };

// Types for autocomplete & type checking in VSCode.
// Good to later convert to real ts.
export const stripeSubscriptionKeys: StripeObjectUpdateKeys;

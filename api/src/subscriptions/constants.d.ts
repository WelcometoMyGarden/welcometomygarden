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
  'renewalInvoiceLink',
  'collectionMethod'
];
type StripeUpdateKey = StripeSubscriptionKeys[number];
type StripeUpdateKeysWithKeySuffix = `${StripeUpdateKey}Key`;
type StripeObjectUpdateKeys = { [key in StripeUpdateKeysWithKeySuffix]: string };

// These keys include the subscription parent key and child key (ex. stripeSubscription.currentPeriodEnd)
// to directly subscript the users-private collection.
//
// Types for autocomplete & type checking in VSCode.
// Good to later convert to real ts.
export const stripeSubscriptionKeys: StripeObjectUpdateKeys;

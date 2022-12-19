const stripeKeys = [
  'latestInvoiceStatus',
  'priceId',
  'status',
  'id',
  'currentPeriodStart',
  'currentPeriodEnd',
  'startDate',
  'cancelAt',
  'canceledAt'
] as const;
type StripeUpdateKeys = typeof stripeKeys[number];
type StripeUpdateKeysWithKeySuffix = `${StripeUpdateKeys}Key`;
type StripeObjectUpdateKeys = { [key in StripeUpdateKeysWithKeySuffix]: string };

// Types for autocomplete & type checking in VSCode.
// Good to later convert to real ts.
export const stripeSubscriptionKeys: StripeObjectUpdateKeys;

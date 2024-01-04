import { derived } from 'svelte/store';
import { user } from './auth';

export const hasValidSubscription = derived(user, ($user) =>
  $user?.superfan
    ? $user.stripeSubscription &&
      $user.stripeSubscription.status === 'active' &&
      $user.stripeSubscription.latestInvoiceStatus === 'paid'
    : false
);

const nowSeconds = () =>
  // 1827649800 + 3600 * 24 * 7 + 3600;
  new Date().valueOf() / 1000;

// nowSeconds just as a default value
const sevenDayMarkSec = derived(user, ($user) =>
  $user?.stripeSubscription?.currentPeriodStart != null
    ? $user.stripeSubscription.currentPeriodStart + 3600 * 24 * 7
    : null
);

// The last cycle of the subscription ended at most 30 days ago, and the latest
// invoice wasn't paid
//
// Note: until after 7 days, the current subscription can be renewed.
// After that, a new one has to be completed.
export const subscriptionJustEnded = derived(
  user,
  ($user) =>
    $user?.stripeSubscription &&
    $user.stripeSubscription.latestInvoiceStatus !== 'paid' &&
    // This is not the initial invoice
    $user.stripeSubscription.currentPeriodStart !== $user.stripeSubscription.startDate &&
    // It was at most 30 days since the last cycle ended
    nowSeconds() < $user.stripeSubscription.currentPeriodStart + 3600 * 24 * 30
);

export const hasOpenRenewalInvoice = derived(
  [user, sevenDayMarkSec],
  ([$user, $sevenDayMarkSec]) =>
    $sevenDayMarkSec &&
    $user?.superfan &&
    $user.stripeSubscription &&
    $user.stripeSubscription.latestInvoiceStatus === 'open' &&
    $user.stripeSubscription.renewalInvoiceLink &&
    // The current second epoch is less than 7 days from the current (= new/unpaid) period start
    nowSeconds() < $sevenDayMarkSec
);

export const shouldPromptForNewSubscription = derived(
  [subscriptionJustEnded, sevenDayMarkSec],
  ([$subscriptionJustEnded, $sevenDayMarkSec]) =>
    $sevenDayMarkSec && $subscriptionJustEnded && nowSeconds() >= $sevenDayMarkSec
);

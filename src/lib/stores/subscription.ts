import { derived } from 'svelte/store';
import { user } from './auth';
import { isLoading, locale, t } from 'svelte-i18n';
import { MEMBERSHIP_YEARLY_AMOUNTS } from '$lib/constants';
import { anchorText } from '$lib/util/translation-helpers';
import routes from '$lib/routes';
import { PlausibleEvent } from '$lib/types/Plausible';

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

// 7 days after the expiry of the last period
// NOTE: only valid for send_invoice subs
const sevenDayMarkSec = derived(user, ($user) =>
  $user?.stripeSubscription?.currentPeriodStart != null
    ? $user.stripeSubscription.currentPeriodStart + 3600 * 24 * 7
    : null
);

// The last cycle of the subscription ended at most 30 days ago, and the latest
// invoice wasn't paid
//
// Note: until after 7 days, the current subscription can be renewed.
// After that, a new one has to be completed. This logic isn't handled here.
export const subscriptionJustEnded = derived(
  user,
  ($user) =>
    $user?.stripeSubscription != null &&
    $user.stripeSubscription.latestInvoiceStatus !== 'paid' &&
    // This is not the initial invoice
    $user.stripeSubscription.currentPeriodStart !== $user.stripeSubscription.startDate &&
    // It was at most 30 days since the last cycle ended
    nowSeconds() < $user.stripeSubscription.currentPeriodStart + 3600 * 24 * 30
);

export const hasAutoRenewingSubscription = derived(
  user,
  ($user) =>
    $user?.superfan && $user.stripeSubscription?.collectionMethod === 'charge_automatically'
);

export const canPayRenewalInvoice = derived(
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

// This is extracted here because it's shared between the top navbar and the mobile side navbar
// TODO: the downside is that here, it will always load and update, regardless of the page we're on.
// Should we initialize a store per-page?
// TODO: should the notice be shown for longer than 30 days?
export const renewalNoticeContent = derived(
  [t, isLoading, shouldPromptForNewSubscription, canPayRenewalInvoice, locale, user],
  ([$t, $isLoading, $shouldPromptForNewSubscription, $canPayRenewalInvoice, $locale, $user]) => {
    if (!$isLoading && $user?.stripeSubscription) {
      return {
        prompt: $t('navigation.membership-expired-notice.prompt', {
          values: {
            // Only show the amount if we're still in the renewal window
            // (for now, only the same price can be renewed)
            // Afterwards, any pricing level can be picked for a new sub.
            amount: $shouldPromptForNewSubscription
              ? ''
              : ` (${
                  ($locale !== 'fr' ? '€ ' : '') +
                  (MEMBERSHIP_YEARLY_AMOUNTS[$user.stripeSubscription.priceId] || 60) +
                  ($locale === 'fr' ? '€' : '') +
                  $t('become-superfan.pricing-section.per-year')
                })`
          }
        }),
        answerHtml: $t('navigation.membership-expired-notice.answer', {
          values: {
            linkText: anchorText({
              href:
                $canPayRenewalInvoice && $user.stripeSubscription.renewalInvoiceLink
                  ? $user.stripeSubscription.renewalInvoiceLink
                  : `${routes.ABOUT_MEMBERSHIP}#pricing`,
              // TODO: this isn't accurate, the hosted invoice page visitors aren't about_membership page visitors
              // also, no side_ or top_ navbar renewal distinction
              track: [PlausibleEvent.VISIT_ABOUT_MEMBERSHIP, { source: 'navbar_renewal' }],
              linkText: $t('navigation.membership-expired-notice.link-text'),
              style: 'text-decoration: underline; cursor: pointer;',
              newtab: false
            })
          }
        })
      };
    }
  }
);

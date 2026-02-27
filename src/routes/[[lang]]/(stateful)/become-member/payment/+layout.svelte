<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { onDestroy, onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import type { LayoutData } from './$types';
  import { goto } from '$lib/util/navigate';
  import routes from '$lib/routes';
  import { type StripeError } from '@stripe/stripe-js';
  import { createOrRetrieveUnpaidSubscription } from '$lib/api/functions';
  import { timeout } from '$lib/util/timeout';
  import {
    hasActiveSubscription,
    getSubLevelFromUser,
    getSubLevelBySlug
  } from '$lib/components/Membership/subscription-utils';
  import { emailAsLink, SUPPORT_EMAIL } from '$lib/constants';
  import { page } from '$app/state';
  import { lr } from '$lib/util/translation-helpers';
  import {
    DEFAULT_MEMBER_LEVEL,
    type SuperfanLevelData
  } from '$lib/components/Membership/superfan-levels';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import * as Sentry from '@sentry/sveltekit';
  import isFirebaseError from '$lib/util/types/isFirebaseError';
  import { Progress } from '$lib/components/UI';
  import {
    DefaultAndroidSystemBrowserOptions,
    DefaultiOSSystemBrowserOptions,
    DefaultWebViewOptions,
    InAppBrowser
  } from '@capacitor/inappbrowser';
  import logger from '$lib/util/logger';
  import NProgress from 'nprogress';
  import { isNative } from '$lib/util/uaInfo';
  import createUrl from '$lib/util/create-url';
  import PaymentPage from '../PaymentPage.svelte';
  import { trackEvent } from '$lib/util';
  import { PlausibleEvent } from '$lib/types/Plausible';

  // TODO: the Svelte 5 upgrade of svelte-stripe is not complete yet
  // at the time of writing, see https://github.com/joshnuss/svelte-stripe/pull/131

  // TODO: if you subscribe & unsubscribe in 1 session without refreshing, no new sub will be auto-generated
  // we could fix this by detecting changes to the user (if we go from subscribed -> unsubscribed)
  // or by keeping state on whether the payment module is shown

  interface Props {
    // (if new state: not shown, not subscribed -> create new sub and show element)
    data: LayoutData;
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let elementsSpan: Sentry.Span | null = $state(null);
  let paymentElementReady = $state(false);
  let isSuccess = $state(false);

  // - payment_intent_client_secret
  // - payment_intent : the pi_... id
  // - redirect_status : 'succeeded' | 'failed' | 'pending' (= processing, like for SEPA)
  // This is also given by the modal parent page
  // Stripe seems to merge these with other existing search params in the search URL.
  let { payment_intent_client_secret, payment_intent, redirect_status } = $derived(
    Object.fromEntries(page.url.searchParams.entries())
  );

  let inAppPaymentPage = $state('');

  let processingPayment = $state(false);
  let error: StripeError | Error | null = $state(null);

  // TODO: this can also be $page.params presumably, we shoudn't need layout.ts here
  let selectedLevel: SuperfanLevelData | undefined = $state(
    getSubLevelBySlug(page.params.id ?? DEFAULT_MEMBER_LEVEL)
  );

  const continueUrl = $derived(page.url.searchParams.get('continueUrl'));

  let nativeModalClosedBySuccess = false;

  /**
   * Gets the current fully-qualified URL of the current page,
   * stripping all query paramters, except continue URL, if it exists
   */
  function currentUrlWithContinueUrlOnly() {
    const newURL = new URL(document.location.href);
    const newParams = new URLSearchParams();
    if (continueUrl) {
      newParams.set('continueUrl', continueUrl);
    }
    newURL.search = `${newParams.size > 0 ? '?' : ''}${newParams.toString()}`;
    return newURL.toString();
  }

  // Subscribe to user state changes
  let unsubscribeFromUser = user.subscribe((newUserData) => {
    logger.log('Receiving new user state');
    if (newUserData && hasActiveSubscription(newUserData)) {
      logger.log('The received user is subscribed');
      selectedLevel = getSubLevelFromUser(newUserData);
      return;
    }
    logger.log('The received user is not subscribed');
  });

  const unsubscribeFromLocale = _.subscribe(async () => {
    // TODO: this doesn't work, implement reactivity on Stripe somehow?
    // await reloadStripe();
  });

  onMount(async () => {
    elementsSpan = Sentry.startSpanManual(
      { name: 'Stripe Elements Load', op: 'stripe.elements.load' },
      (span) => (elementsSpan = span)
    );

    logger.log('Running onMount');
    // Since this is a child of the stateful layout, we can assume that the user is already loaded here.
    if (!$user) {
      notify.warning($_('payment-superfan.not-logged-in-warning'), 10000);
      // replaceState: replaces the state of the current page, which we want,
      // because when a visitor click back on the Sign in page, they should go back to /become-superfan
      // and not to /become-superfan/payment, which puts them in a redirect "loop"
      // https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API#the_replacestate_method
      return goto($lr(routes.SIGN_IN), { replaceState: true });
    } else {
      // Check if we got redirected back from Stripe
      switch (redirect_status) {
        case 'pending':
        case 'succeeded':
          logger.log(`onMount: success with ${redirect_status} payment`);
          return await paymentSucceeded();
        case 'failed':
          // payment_intent_client_secret will be renewed, let PaymentPage handle the rest
          logger.debug('Detected failed payment, reloading PaymentPage');
          return;
        default:
          logger.debug('No Stripe redirect params found on the payment page');
        // Note: 'failed' is handled by paymentpage (TODO: and maybe everything should be)
      }

      if (hasActiveSubscription($user)) {
        logger.log('onMount: $user is subscribed, selecting level');
        // Make sure the correct price is shown, even if the user re-entered another price page
        selectedLevel = getSubLevelFromUser($user);
        return;
      }

      logger.log('onMount: $user is not subscribed');

      if (!selectedLevel) {
        logger.error("Didn't select, or couldn't find, a price level");
        return;
      }

      try {
        const { data: subData } = await timeout(
          createOrRetrieveUnpaidSubscription({
            priceId: selectedLevel.stripePriceId!,
            // Note: this may not be a supported locale
            locale: $locale || 'en'
          }),
          // In case an invoice is changed, it takes longer than 4 seconds
          15000
        );
        if (subData.clientSecret) {
          logger.debug('Got payment_intent_client_secret', subData.clientSecret);
          payment_intent_client_secret = subData.clientSecret;
        } else {
          logger.error(
            'Unexpected: no client secret returned by an non-erroring createOrRetrieveUnpaidSubscription'
          );
        }
      } catch (firebaseError: any) {
        if (isFirebaseError(firebaseError) && firebaseError.code === 'functions/already-exists') {
          processingPayment = true;
          // This means, in the best case, that we're already subscribed and no payment is due.
          // Wait until the User state gets updated (there might be an issue there).
          logger.warn(
            'Tried to recreate an existing, paid subscription.' +
              ' Are our Stripe backend webhooks working & syncing data to Firebase?'
          );
          error = new Error(
            $_('payment-superfan.payment-section.errors.systems-error', {
              values: {
                supportEmail: SUPPORT_EMAIL
              }
            })
          );
          return;
        } else {
          processingPayment = false;
          logger.error(firebaseError);
          error = new Error($_('payment-superfan.payment-section.errors.loading-error'));
        }
        Sentry.captureException(firebaseError, {
          extra: {
            context: 'Error while creating a subscription',
            isFirebaseError: isFirebaseError(firebaseError)
          }
        });
      }

      // await reloadStripe();
    }
  });

  onDestroy(() => {
    unsubscribeFromUser();
    unsubscribeFromLocale();
  });

  /**
   * Navigate to the success page, which is the continueUrl if defined, or Thank You page otherwise.
   * @returns true on a successful navigation
   */
  async function paymentSucceeded() {
    // This helps to clean up the payment element <Progress> which will start loading regardless
    // of payment initiation, failure or success. It should not load on payment success,
    // since we're going for a redirect here and it will leak into the next page.
    isSuccess = true;
    if (continueUrl) {
      notify.success($_('payment-superfan.payment-section.success'), 20000);
      // Tracking default given continueUrl: from trying to chat with someone
      let source = 'map_garden';
      if (continueUrl.includes(routes.ROUTE_PLANNER)) {
        source = 'routeplanner';
      }
      trackEvent(PlausibleEvent.MEMBER_CONVERSION, { source });
      // Note: this should be a relative continue URL only
      // Note: this continueUrl is already localized
      await goto(continueUrl);
      return true;
    }
    trackEvent(PlausibleEvent.MEMBER_CONVERSION, { source: 'direct' });
    await goto($lr(routes.MEMBER_THANK_YOU));
    return true;
  }
</script>

<svelte:head>
  <title>{$_('payment-superfan.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={!paymentElementReady && !isSuccess} />
<PaddedSection topMargin={false}>
  {#if $user && selectedLevel && !hasActiveSubscription($user) && payment_intent_client_secret}
    <!-- {#if !isNative} -->
    <PaymentPage
      {payment_intent_client_secret}
      selectedLevel={getSubLevelBySlug(page.params.id ?? DEFAULT_MEMBER_LEVEL)!}
      name={`${$user?.firstName} ${$user?.lastName}`}
      email={$user?.email}
      onPaymentSucceeded={paymentSucceeded}
      returnUrl={currentUrlWithContinueUrlOnly()}
    />
    <!-- {:else}
      <iframe title="Mobile payment page" src={inAppPaymentPage}></iframe>
    {/if} -->
  {:else if $user && hasActiveSubscription($user)}
    <!-- Subscription block -->
    <!-- Show status -->
    <p>
      {$_('payment-superfan.payment-section.youre-subscribed')}
      {#if selectedLevel && selectedLevel.stripePriceId !== selectedLevel.stripePriceId}
        {@html $_('payment-superfan.payment-section.no-switching-here', {
          values: {
            supportEmail: emailAsLink
          }
        })}
      {/if}
    </p>
  {:else}
    No user!
  {/if}
  <!-- Unused slot, just to get rid of a compile-time warning -->
  {@render children?.()}
</PaddedSection>

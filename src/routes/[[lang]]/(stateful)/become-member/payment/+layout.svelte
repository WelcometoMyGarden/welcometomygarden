<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { onDestroy, onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import type { LayoutData } from './$types';
  import { goto } from '$lib/util/navigate';
  import routes, { getBaseRouteIn } from '$lib/routes';
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
  import {
    DefaultAndroidSystemBrowserOptions,
    DefaultiOSSystemBrowserOptions,
    InAppBrowser
  } from '@capacitor/inappbrowser';
  import logger from '$lib/util/logger';
  import NProgress from 'nprogress';
  import { isNative } from '$lib/util/uaInfo';
  import createUrl from '$lib/util/create-url';
  import PaymentPage from '../PaymentPage.svelte';
  import { trackEvent } from '$lib/util';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { App as CapacitorApp, type URLOpenListenerEvent } from '@capacitor/app';
  import { Capacitor } from '@capacitor/core';
  import LoadingPage from '../LoadingPage.svelte';

  // TODO: if you subscribe & unsubscribe in 1 session without refreshing, no new sub will be auto-generated
  // we could fix this by detecting changes to the user (if we go from subscribed -> unsubscribed)
  // or by keeping state on whether the payment module is shown

  interface Props {
    // (if new state: not shown, not subscribed -> create new sub and show element)
    data: LayoutData;
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  // - payment_intent_client_secret
  // - payment_intent : the pi_... id
  // - redirect_status : 'succeeded' | 'failed' | 'pending' (= processing, like for SEPA)
  // This is also given by the modal parent page
  // Stripe seems to merge these with other existing search params in the search URL.
  let { payment_intent_client_secret, redirect_status } = $derived(
    Object.fromEntries(page.url.searchParams.entries())
  );

  // reactive state
  let error: StripeError | Error | null = $state(null);
  let selectedLevel: SuperfanLevelData | undefined = $state(
    getSubLevelBySlug(page.params.id ?? DEFAULT_MEMBER_LEVEL)
  );

  let waitingOnSuperfanStatus = $state(false);
  let _hasActiveSubscription = $derived($user ? hasActiveSubscription($user) : false);

  const continueUrl = $derived(page.url.searchParams.get('continueUrl'));

  // non-reactive state reactive
  let closeEventTimeout: number | undefined;
  let inAppBrowserClosedByAppEvent = false;
  let inAppBrowserIsOpen = false;

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

  if (isNative) {
    // Return handler for native universal/app links
    // These are a fallback, we wait for membership status by default
    CapacitorApp.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
      try {
        let { pathname, searchParams } = new URL(event.url);
        if (pathname && getBaseRouteIn(pathname) === routes.APP_PAYMENT) {
          if (closeEventTimeout) {
            // In this case, the InAppBrowser is already closed (on Android). Cancel the automatic close handling.
            // We don't want to use that handler anymore anyway
            inAppBrowserIsOpen = false;
            logger.debug('Clearing the postponed Android InAppBrowser close event');
            clearTimeout(closeEventTimeout);
          }
          logger.debug('Handling universal link in payment page', event.url);
          const {
            payment_intent_client_secret: newClientSecret,
            redirect_status: newRedirectStatus
          } = Object.fromEntries(searchParams.entries());
          logger.debug('Old params: ', redirect_status, payment_intent_client_secret);
          if (newRedirectStatus) {
            redirect_status = newRedirectStatus;
          }
          if (newClientSecret) {
            payment_intent_client_secret = newClientSecret;
          }
          logger.debug(
            'New settings from native link',
            redirect_status,
            payment_intent_client_secret
          );

          if (newRedirectStatus) {
            // If we handle an app link here, then the closure
            // is due to an an app link in any case of redirect_status
            inAppBrowserClosedByAppEvent = true;
            // This will handle native app success or failure based on the redirect_status set
            // Note: this should also still pick up the existing continueUrl
            logger.debug('Starting to reload payment page from native link handler');
            try {
              // On Android, it is already closed by opening the link, but it doesn't seem
              // to hurt to close it again anyway (just in case older Android versions cause issues here?)
              inAppBrowserIsOpen = false;
              await InAppBrowser.close();
            } catch (e) {
              logger.error('Error while closing the InAppBrowser', e);
            }
            reloadPage();
          } else {
            logger.warn('Unexpected missing redirect_status from native return URL');
          }
        }
        // Note: this link is handled in the root layout
        return;
      } catch (e) {
        logger.error(`Error parsing appUrl open ${event.url}`);
      }
    });
  }

  // Subscribe to user state changes

  const unsubscribeFromLocale = _.subscribe(async () => {
    // TODO: this doesn't work, implement reactivity on Stripe somehow?
    // await reloadStripe();
  });

  const handleNativePayment = async (clientSecret: string) => {
    if (!$user) {
      logger.warn('$user unexpectedly null when opening native payment');
      return;
    }
    const loc = window.location;
    // Note: we don't need to pass the continueUrl, since in case of success
    // we'll continue handling the success here, which already has continueUrl
    const inAppPaymentPageURL = createUrl(
      `${loc.protocol}//${loc.host}${$lr(routes.APP_PAYMENT)}`,
      {
        payment_intent_client_secret: clientSecret,
        name: `${$user.firstName} ${$user.lastName}`,
        email: $user.email,
        slug: page.params.id ?? DEFAULT_MEMBER_LEVEL,
        platform: Capacitor.getPlatform(),
        ...(redirect_status
          ? {
              redirect_status
            }
          : {})
      }
    );

    logger.debug(`Opening ${inAppPaymentPageURL} in a system browser view`);

    // Set up in-app browser listeners
    InAppBrowser.removeAllListeners();

    function handleInAppBrowserClose() {
      inAppBrowserIsOpen = false;
      if (inAppBrowserClosedByAppEvent) {
        logger.log('Ignored browser InAppBrowser close due to handled app link');
        return;
      } else {
        logger.log('Handling manual user InAppBrowser close');
        // the user tried to abort the modal. Pop them back to whence they came, this
        // page will not be useful to them
        NProgress.done();
        history.back();
      }
    }
    await Promise.all([
      InAppBrowser.addListener('browserClosed', () => {
        if (Capacitor.getPlatform() === 'android') {
          // on Android, the browser close event is called BEFORE
          // the appUrlOpen event, but we depend on that event to handle the close event
          logger.debug(
            'Postponing the InAppBrowser browserClosed event until either appUrlOpen event is handled (see there), or 2000ms'
          );
          closeEventTimeout = window.setTimeout(handleInAppBrowserClose, 2000);
        } else {
          // on iOS, the browser close event when a universal link is opened
          // is called  AFTER the appUrlOpen event
          handleInAppBrowserClose();
        }
      })
    ]);
    await InAppBrowser.openInSystemBrowser({
      url: inAppPaymentPageURL,
      options: {
        iOS: DefaultiOSSystemBrowserOptions,
        android: DefaultAndroidSystemBrowserOptions
      }
    });
    inAppBrowserIsOpen = true;
    return;
  };

  const reloadPage = async () => {
    logger.log('Reloading payment page');
    logger.debug('continueUrl', continueUrl);
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
          logger.debug('Detected failed payment, reloading PaymentPage');
          if (isNative) {
            await handleNativePayment(payment_intent_client_secret);
          }
          // Otherwise: on desktop this should be a fresh page load
          // let normal PaymentPage init handle the failed payment
          return;
        default:
          logger.debug('No Stripe redirect params found on the payment page');
        // Note: 'failed' is handled by paymentpage (TODO: and maybe everything should be)
      }

      if (_hasActiveSubscription) {
        logger.log('onMount: $user is subscribed, selecting level');
        // Make sure the correct price is shown that the user currently has,
        // even if the user opened another price page
        selectedLevel = getSubLevelFromUser($user);
        return;
      }

      logger.log('onMount: $user is not subscribed');
      waitingOnSuperfanStatus = true;

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
        if (subData?.clientSecret && isNative) {
          await handleNativePayment(subData.clientSecret);
          return;
        } else if (subData.clientSecret) {
          logger.debug('Got payment_intent_client_secret', subData.clientSecret);
          payment_intent_client_secret = subData.clientSecret;
        } else {
          logger.error(
            'Unexpected: no client secret returned by an non-erroring createOrRetrieveUnpaidSubscription'
          );
        }
      } catch (firebaseError: any) {
        if (isFirebaseError(firebaseError) && firebaseError.code === 'functions/already-exists') {
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
  };

  onMount(reloadPage);

  onDestroy(() => {
    unsubscribeFromLocale();
  });

  /**
   * Navigate to the success page, which is the continueUrl if defined, or Thank You page otherwise.
   * @returns true on a successful navigation
   */
  async function paymentSucceeded() {
    if (!_hasActiveSubscription && continueUrl) {
      // This status should still be set when there is a succeeded redirecting payment
      // Only wait when there is a continueUrl.
      waitingOnSuperfanStatus = true;
      return;
    }

    NProgress.done();

    if (continueUrl) {
      logger.debug('Handling payment succeeded with a continueUrl', continueUrl);
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
    } else {
      // If there is no continueUrl, we're not waiting.
      // We assume that there is enough waiting time on the Thank You page.
      waitingOnSuperfanStatus = false;
    }
    logger.debug('Handling payment succeeded without a continueUrl');
    trackEvent(PlausibleEvent.MEMBER_CONVERSION, { source: 'direct' });
    await goto($lr(routes.MEMBER_THANK_YOU));
    return true;
  }

  $effect(() => {
    // Execute payentSucceeded when this page notices an an active subscription after load
    if (_hasActiveSubscription && waitingOnSuperfanStatus) {
      logger.debug('Receiving new superfan status');
      inAppBrowserClosedByAppEvent = true;
      let continuePromise = Promise.resolve();
      if (inAppBrowserIsOpen) {
        continuePromise = InAppBrowser.close();
      }
      waitingOnSuperfanStatus = false;
      continuePromise.then(paymentSucceeded);
    }
  });
</script>

<svelte:head>
  <title>{$_('payment-superfan.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

{#if error}
  <PaddedSection topMargin={false}>
    <!-- This is likely an error where the Stripe sub could not be created -->
    <p class="error">{error.message}</p>
  </PaddedSection>
{:else if !isNative}
  <!-- No error, not on native: show the desktop payment page. -->
  {#if $user}
    {#if selectedLevel && !_hasActiveSubscription && payment_intent_client_secret}
      <!-- Note: paymentpage itself decided whether to show the payment element or a loading indicator -->
      <PaymentPage
        {payment_intent_client_secret}
        selectedLevel={getSubLevelBySlug(page.params.id ?? DEFAULT_MEMBER_LEVEL)!}
        name={`${$user?.firstName} ${$user?.lastName}`}
        email={$user?.email}
        onPaymentSucceeded={paymentSucceeded}
        returnUrl={currentUrlWithContinueUrlOnly()}
      />
    {:else if _hasActiveSubscription && !waitingOnSuperfanStatus}
      <!-- waitingOnSuperfanStatus check to prevent showing this in the milliseconds
      before a redirect happens
     -->
      <PaddedSection topMargin={false}>
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
      </PaddedSection>
    {:else}
      <!-- The Stripe info (client secret) is still loading in this case -->
      <LoadingPage />
    {/if}
  {:else}
    <PaddedSection topMargin={false}>
      <!-- This shouldn't happen, because the user should already be loaded in a stateful page -->
      No user!
    </PaddedSection>
  {/if}
  <!-- Unused slot, just to get rid of a compile-time warning -->
  {@render children?.()}
{:else}
  <!-- We're on native, show that we're loading. The InAppBrowser will be opened over this. -->
  <LoadingPage />
{/if}

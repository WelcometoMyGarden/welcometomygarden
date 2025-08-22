<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { onDestroy, onMount } from 'svelte';
  import { user } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import type { LayoutData } from './$types';
  import { goto } from '$lib/util/navigate';
  import routes from '$lib/routes';
  import {
    loadStripe,
    type CheckoutLocale,
    type Stripe,
    type StripeElementLocale,
    type StripeElements,
    type StripeError
  } from '@stripe/stripe-js';
  import { Elements, PaymentElement } from 'svelte-stripe';
  import { createOrRetrieveUnpaidSubscription } from '$lib/api/functions';
  import { timeout } from '$lib/util/timeout';
  import {
    hasActiveSubscription,
    getSubLevelFromUser,
    getSubLevelBySlug
  } from '$lib/components/Membership/subscription-utils';
  import Button from '$lib/components/UI/Button.svelte';
  import { emailAsLink, SUPPORT_EMAIL } from '$lib/constants';
  import LevelSummary from './LevelSummary.svelte';
  import { page } from '$app/stores';
  import { anchorText, lr } from '$lib/util/translation-helpers';
  import {
    DEFAULT_MEMBER_LEVEL,
    type SuperfanLevelData
  } from '$lib/components/Membership/superfan-levels';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import * as Sentry from '@sentry/sveltekit';
  import isFirebaseError from '$lib/util/types/isFirebaseError';
  import { Progress } from '$lib/components/UI';
  import { trackEvent } from '$lib/util';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { Capacitor } from '@capacitor/core';
  import { DefaultWebViewOptions, InAppBrowser } from '@capacitor/inappbrowser';
  import logger from '$lib/util/logger';

  // TODO: the Svelte 5 upgrade of svelte-stripe is not complete yet
  // at the time of writing, see https://github.com/joshnuss/svelte-stripe/pull/131

  // TODO: if you subscribe & unsubscribe in 1 session without refreshing, no new sub will be auto-generated
  // we could fix this by detecting changes to the user (if we go from subscribed -> unsubscribed)
  // or by keeping state on whether the payment module is shown
  // (if new state: not shown, not subscribed -> create new sub and show element)

  export let data: LayoutData;

  let stripe: Stripe | null = null;

  let elements: StripeElements;

  let elementsSpan: Sentry.Span | null = null;
  let paymentElementReady = false;
  let isSuccess = false;

  // payment intent client secret
  let clientSecret: string | null = null;
  let processingPayment = false;
  let error: StripeError | Error | null = null;

  let selectedLevel: SuperfanLevelData | undefined = getSubLevelBySlug(
    data.params.id ?? DEFAULT_MEMBER_LEVEL
  );

  let requestedLevel = selectedLevel;

  const continueUrl = $page.url.searchParams.get('continueUrl');

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

  const submit = async () => {
    if (!stripe || !clientSecret) return;
    // avoid processing duplicates
    if (processingPayment) return;
    processingPayment = true;
    // confirm payment with stripe
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        // Redirect to the current page, passing on the continueUrl
        return_url: currentUrlWithContinueUrlOnly(),
        payment_method_data: {
          billing_details: {
            email: $user?.email
          }
        }
      }
    });

    // This part of the code is only reached by payment methods that do not redirect!
    logger.log('Stripe confirmation result', { result });
    if (result.error) {
      // payment failed, notify user
      if (error?.message) error.message += ' Please try again.';
      error = result.error;
    } else if (
      result.paymentIntent.status === 'succeeded' ||
      result.paymentIntent.status === 'processing'
    ) {
      // In case of "processing" (part of the SEPA flow), assumme provisional success
      logger.log('payment intent status:', result.paymentIntent.status);
      logger.log('stripe.confirmPayment succeeded, redirecting to the Thank You page or next');
      await paymentSucceeded();
      // payment succeeded, wait for the user object to update
    }
    // In any case, we're done processing.
    processingPayment = false;
  };

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

  const reloadStripe = async () => {
    // Load the Stripe payment elements
    // TODO: can we fix this TS locale `as` hack? Verify that our input locales are always valid?
    logger.log('Reloading stripe');
    stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
      // Note: this will use e.g. Polish if it were set, not just supported languages
      locale: ($locale as StripeElementLocale | CheckoutLocale) || 'auto'
    });
  };

  const unsubscribeFromLocale = _.subscribe(async () => {
    // TODO: this doesn't work, implement reactivity on Stripe somehow?
    // await reloadStripe();
  });

  /**
   * @returns true if search params were processed, which means that no further subscription
   * processing is required.
   *          false if no search params were found & processed
   */
  const processStripeSearchParams = async () => {
    // Check if we got redirected back from a succesful or failed payment
    // Relevant for bancontact and other redirect methods.
    const searchParams = new URLSearchParams(document.location.search);
    if (searchParams.get('payment_intent')) {
      logger.log('onMount: redirect params were found');
      // I couldn't find proper docs of these query parameters,
      // https://stripe.com/docs/js/setup_intents/confirm_setup
      // > If they fail to authorize the payment, they will be redirected back to your return_url
      // > and the **SetupIntent** will have a status of requires_payment_method.
      // > In this case you should attempt to recollect payment from the user.
      // So our backend should in any case return that payment intent on the createOrRetrieveUnpaidSubscription
      // (maybe we can adjust it to return an eventual previous error, via requires_payment_method)
      //
      // Empirically, these seem to exist:
      // ?payment_intent=&payment_intent_client_secret=&redirect_status=failed
      // the last status can be 'failed' or 'succeeded'
      // Stripe seems to merge these with the possible continueUrl parameter.
      if (searchParams.get('redirect_status')) {
        const status = searchParams.get('redirect_status');
        const clientSecretFromUrl = searchParams.get('payment_intent_client_secret');
        // Clear search params, to not repeat an error on refresh
        // window.history.replaceState({}, document.title, document.location.pathname);

        switch (status) {
          case 'pending':
            // This happens when the payment is pending (e.g. Sofort). In this case, paymentProcessing will be set to
            // true, and it will reactively make the user a superfan.
            logger.log('onMount: success with pending payment');
            return paymentSucceeded();
          case 'failed':
            error = new Error($_('payment-superfan.payment-section.errors.payment-error'));
            if (clientSecretFromUrl) {
              clientSecret = clientSecretFromUrl;
            }
            await reloadStripe();
            return true;
          case 'succeeded':
            logger.log(
              'onMount: redirect_status param was "succeeded", redirecting to the continueUrl or Thank You page'
            );
            return paymentSucceeded();
        }
      }
    }
    return false;
  };

  onMount(async () => {
    elementsSpan = Sentry.startSpanManual(
      { name: 'Stripe Elements Load', op: 'stripe.elements.load' },
      (span) => (elementsSpan = span)
    );

    logger.log('Running onMount');
    if (!$user) {
      notify.warning($_('payment-superfan.not-logged-in-warning'), 10000);
      // replaceState: replaces the state of the current page, which we want,
      // because when a visitor click back on the Sign in page, they should go back to /become-superfan
      // and not to /become-superfan/payment, which puts them in a redirect "loop"
      // https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API#the_replacestate_method
      return goto($lr(routes.SIGN_IN), { replaceState: true });
    } else {
      // Check if we got redirected back from Stripe
      const processed = await processStripeSearchParams();
      if (processed) {
        // no more processing needed
        return;
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
        const { data } = await timeout(
          createOrRetrieveUnpaidSubscription({
            priceId: selectedLevel.stripePriceId,
            // Note: this may not be a supported locale
            locale: $locale || 'en'
          }),
          // In case an invoice is changed, it takes longer than 4 seconds
          15000
        );
        if (data?.clientSecret && Capacitor.isNativePlatform()) {
          const loc = window.location;
          const inAppPaymentPage = `${loc.protocol}//${loc.host}/app-payment?${new URLSearchParams({
            clientSecret: data?.clientSecret,
            name: `${$user?.firstName} ${$user?.lastName}`,
            email: $user?.email
          }).toString()}`;
          console.debug(`Opening ${inAppPaymentPage} in a webview`);
          await InAppBrowser.openInWebView({
            url: inAppPaymentPage,
            options: DefaultWebViewOptions
          });
          return;
        } else if (clientSecret) {
          clientSecret = data.clientSecret;
        } else {
          console.error(
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

      await reloadStripe();
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
{#if selectedLevel && $user && !hasActiveSubscription($user)}
  <PaddedSection className="summary-section" desktopOnly>
    <LevelSummary level={selectedLevel} />
  </PaddedSection>
{/if}
<PaddedSection topMargin={false}>
  {#if $user && selectedLevel && !hasActiveSubscription($user)}
    <!-- Payment block - TODO: move into component -->
    {#if error}
      <p class="error">{error.message}</p>
    {/if}
    {#if stripe && clientSecret}
      <form on:submit|preventDefault={submit}>
        <Elements {stripe} {clientSecret} bind:elements>
          <span class="method-title">{$_('payment-superfan.payment-section.payment-method')}</span>
          <PaymentElement
            on:ready={() => {
              elementsSpan?.end();
              paymentElementReady = true;
            }}
            options={{
              paymentMethodOrder: ['bancontact', 'card', 'ideal', 'sofort'],
              terms: { bancontact: 'never', sepaDebit: 'never', card: 'never', ideal: 'never' },
              defaultValues: {
                billingDetails: {
                  name: `${$user?.firstName} ${$user?.lastName}`,
                  email: $user?.email
                }
              },
              // Never show an email field, we always use the account email.
              // TODO: check if this is appropriate for PayPal
              fields: {
                billingDetails: {
                  email: 'never'
                }
              }
            }}
          />
        </Elements>
        <div class="payment-button-section">
          <Button type="submit" uppercase medium orange arrow loading={processingPayment} fullWidth
            >{$_('payment-superfan.payment-section.pay-button')}</Button
          >
          <p class="terms">
            {@html $_('payment-superfan.terms', {
              values: {
                termsLink: anchorText({
                  href: $lr(routes.TERMS_OF_USE),
                  class: 'link--neutral',
                  linkText:
                    $locale === 'de'
                      ? ($_('generics.terms-of-use') ?? '')
                      : ($_('generics.terms-of-use') ?? '').toLowerCase()
                })
              }
            })}
          </p>
        </div>
      </form>
    {:else if !error}
      <p>{$_('payment-superfan.payment-section.loading')}</p>
    {/if}
  {:else if $user && hasActiveSubscription($user)}
    <!-- Subscription block -->
    <!-- Show status -->
    <p>
      {$_('payment-superfan.payment-section.youre-subscribed')}
      {#if requestedLevel && selectedLevel && requestedLevel.stripePriceId !== selectedLevel.stripePriceId}
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
  <slot />
</PaddedSection>

<style>
  .method-title {
    /* Taken from Stripe's Payment element CSS */
    font-family:
      -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans',
      'Helvetica Neue', sans-serif;
    font-size: 14.88px;
    color: rgb(48, 49, 61);
    line-height: 17.1167px;
    display: inline-block;
    margin-bottom: 0.8rem;
  }

  /* Exceptionally, less padding */
  :global(.outer.summary-section) {
    margin-bottom: 4rem !important;
  }

  .payment-button-section {
    width: 100%;
    padding: 0 2rem 2rem 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .payment-button-section :global(button) {
    max-width: 30rem;
    margin: 3rem auto 2.7rem auto;
  }

  .error {
    color: var(--color-danger);
  }

  .terms {
    margin-bottom: 0;
    text-align: center;
    font-size: 1.4rem;
    line-height: 1.4;
    max-width: 720px;
    /* Aligns with Stripe payment element grey */
    color: #6d6e78;
  }
  .terms > :global(.link--neutral) {
    color: #6d6e78;
  }
</style>

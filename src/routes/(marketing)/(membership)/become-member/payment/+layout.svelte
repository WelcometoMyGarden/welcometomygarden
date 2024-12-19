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
  } from '../../subscription-utils';
  import PaddedSection from '$routes/(marketing)/_components/PaddedSection.svelte';
  import {
    type SuperfanLevelData,
    DEFAULT_MEMBER_LEVEL
  } from '$routes/(marketing)/_static/superfan-levels';
  import Button from '$lib/components/UI/Button.svelte';
  import { emailAsLink, SUPPORT_EMAIL } from '$lib/constants';
  import LevelSummary from './LevelSummary.svelte';
  import { page } from '$app/stores';

  // TODO: if you subscribe & unsubscribe in 1 session without refreshing, no new sub will be auto-generated
  // we could fix this by detecting changes to the user (if we go from subscribed -> unsubscribed)
  // or by keeping state on whether the payment module is shown
  // (if new state: not shown, not subscribed -> create new sub and show element)

  export let data: LayoutData;

  let stripe: Stripe | null = null;

  let elements: StripeElements;

  // payment intent client secret
  let clientSecret: string | null = null;
  let processingPayment = false;
  let error: StripeError | Error | null = null;

  let selectedLevel: SuperfanLevelData | undefined = getSubLevelBySlug(
    data.params.id ?? DEFAULT_MEMBER_LEVEL
  );

  let requestedLevel = selectedLevel;

  const continueUrl = $page.url.searchParams.get('continueUrl');

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
        return_url: `${document.location.protocol}//${document.location.hostname}:${
          document.location.port
        }${document.location.pathname}${
          continueUrl ? `?continueUrl=${encodeURIComponent(continueUrl)}` : ''
        }`,
        payment_method_data: {
          billing_details: {
            name: `${$user?.firstName} ${$user?.lastName}`,
            email: $user?.email
          }
        }
      }
    });

    // This part of the code is only reached by payment methods that do not redirect!
    console.log('Stripe confirmation result', { result });
    if (result.error) {
      // payment failed, notify user
      if (error?.message) error.message += ' Please try again.';
      error = result.error;
    } else if (
      result.paymentIntent.status === 'succeeded' ||
      result.paymentIntent.status === 'processing'
    ) {
      // In case of "processing" (part of the SEPA flow), assumme provisional success
      console.log('payment intent status:', result.paymentIntent.status);
      console.log('stripe.confirmPayment succeeded, redirecting to the Thank You page or next');
      await paymentSucceeded();
      // payment succeeded, wait for the user object to update
    }
    // In any case, we're done processing.
    processingPayment = false;
  };

  // Subscribe to user state changes
  let unsubscribeFromUser = user.subscribe((newUserData) => {
    console.log('Receiving new user state');
    if (newUserData && hasActiveSubscription(newUserData)) {
      console.log('The received user is subscribed');
      selectedLevel = getSubLevelFromUser(newUserData);
      return;
    }
    console.log('The received user is not subscribed');
  });

  const reloadStripe = async () => {
    // Load the Stripe payment elements
    // TODO: can we fix this TS locale `as` hack? Verify that our input locales are always valid?
    console.log('Reloading stripe');
    stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
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
      console.log('onMount: redirect params were found');
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
            console.log('onMount: success with pending payment');
            return paymentSucceeded();
          case 'failed':
            error = new Error($_('payment-superfan.payment-section.errors.payment-error'));
            if (clientSecretFromUrl) {
              clientSecret = clientSecretFromUrl;
            }
            await reloadStripe();
            return true;
          case 'succeeded':
            console.log(
              'onMount: redirect_status param was "succeeded", redirecting to the continueUrl or Thank You page'
            );
            return paymentSucceeded();
        }
      }
    }
    return false;
  };

  onMount(async () => {
    // todo: validate priceID
    console.log('Running onMount');
    if (!$user) {
      notify.warning($_('payment-superfan.not-logged-in-warning'), 10000);
      // replaceState: replaces the state of the current page, which we want,
      // because when a visitor click back on the Sign in page, they should go back to /become-superfan
      // and not to /become-superfan/payment, which puts them in a redirect "loop"
      // https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API#the_replacestate_method
      return goto(routes.SIGN_IN, { replaceState: true });
    } else {
      // Check if we got redirected back from Stripe
      const processed = await processStripeSearchParams();
      if (processed) {
        // no more processing needed
        return;
      }

      if (hasActiveSubscription($user)) {
        console.log('onMount: $user is subscribed, selecting level');
        // Make sure the correct price is shown, even if the user re-entered another price page
        selectedLevel = getSubLevelFromUser($user);
        return;
      }

      console.log('onMount: $user is not subscribed');

      if (!selectedLevel) {
        console.error("Didn't select, or couldn't find, a price level");
        return;
      }

      try {
        const { data } = await timeout(
          createOrRetrieveUnpaidSubscription({
            priceId: selectedLevel.stripePriceId,
            locale: $locale || 'en'
          }),
          // In case an invoice is changed, it takes longer than 4 seconds
          15000
        );
        clientSecret = data.clientSecret;
      } catch (firebaseError: any) {
        if (firebaseError && firebaseError.code === 'functions/already-exists') {
          processingPayment = true;
          // This means, in the best case, that we're already subscribed and no payment is due.
          // Wait until the User state gets updated (there might be an issue there).
          console.warn(
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
          console.error(firebaseError);
          error = new Error($_('payment-superfan.payment-section.errors.loading-error'));
        }
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
    if (continueUrl) {
      notify.success($_('payment-superfan.payment-section.success'), 20000);
      // Note: this should be a relative continue URL only
      await goto(continueUrl);
      return true;
    }
    await goto(routes.MEMBER_THANK_YOU);
    return true;
  }
</script>

<svelte:head>
  <title>{$_('payment-superfan.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

{#if selectedLevel && $user && !hasActiveSubscription($user)}
  <PaddedSection desktopOnly>
    <LevelSummary level={selectedLevel} />
  </PaddedSection>
{/if}
<PaddedSection>
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
            options={{
              paymentMethodOrder: ['bancontact', 'card', 'ideal', 'sofort'],
              // terms: { bancontact: 'never', sepaDebit: 'never', card: 'never', ideal: 'never' },
              defaultValues: {
                billingDetails: {
                  name: `${$user?.firstName} ${$user?.lastName}`,
                  email: $user?.email
                }
              }
            }}
          />
        </Elements>
        <div class="payment-button">
          <Button type="submit" uppercase medium orange arrow loading={processingPayment} fullWidth
            >{$_('payment-superfan.payment-section.pay-button')}</Button
          >
          <p class="terms">
            By becoming a member you agree to our Terms of use. Your membership will renew
            automatically after one year, but you can cancel the renewal anytime.
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
</PaddedSection>

<style>
  .method-title {
    /* Taken from Stripe's Payment element CSS */
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
      'Open Sans', 'Helvetica Neue', sans-serif;
    display: inline-block;
    margin-bottom: 0.8rem;
  }
  .payment-button {
    width: 100%;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .payment-button :global(button) {
    max-width: 30rem;
  }

  .error {
    color: var(--color-danger);
  }

  .terms {
    margin-top: 1.3rem;
    text-align: center;
    font-size: 1.4rem;
    line-height: 1.4;
    max-width: 600px;
    /* Aligns with Stripe payment element grey */
    color: #6d6e78;
  }
</style>

<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onDestroy, onMount } from 'svelte';
  import { user } from '@/lib/stores/auth';
  import notify from '$lib/stores/notification';
  import type { PageData } from './$types';
  import { goto } from '@/lib/util/navigate';
  import routes from '@/lib/routes';
  import {
    loadStripe,
    type Stripe,
    type StripeElements,
    type StripeError
  } from '@stripe/stripe-js';
  import { Elements } from 'svelte-stripe';
  // Custom alternative to svelte-stripe's paymentElement
  import PaymentElement from './PaymentElement.svelte';
  import { createOrRetrieveUnpaidSubscription } from '@/lib/api/functions';
  import { timeout } from '@/lib/util/timeout';
  import {
    hasActiveSubscription,
    getSubLevelFromUser,
    getSubLevelBySlug
  } from '../../subscription-utils';
  import PaddedSection from '@/routes/(marketing)/_components/PaddedSection.svelte';
  import type { SuperfanLevelData } from '@/routes/(marketing)/_static/superfan-levels';
  import Button from '@/lib/components/UI/Button.svelte';
  import { SUPPORT_EMAIL } from '@/lib/constants';
  import LevelSummary from './LevelSummary.svelte';

  // TODO: if you subscribe & unsubscribe in 1 session without refreshing, no new sub will be auto-generated
  // we could fix this by detecting changes to the user (if we go from subscribed -> unsubscribed)
  // or by keeping state on whether the payment module is shown
  // (if new state: not shown, not subscribed -> create new sub and show element)

  export let data: PageData;

  let stripe: Stripe | null = null;

  let elements: StripeElements;

  // payment intent client secret
  let clientSecret: string | null = null;
  let processingPayment = false;
  let error: StripeError | Error | null = null;

  let selectedLevel: SuperfanLevelData | undefined = data.params.id
    ? getSubLevelBySlug(data.params.id)
    : undefined;

  let requestedLevel = selectedLevel;

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
        // Redirect to the current page
        return_url: document.location.href
      }
    });

    // log results, for debugging
    console.log({ result });
    if (result.error) {
      // payment failed, notify user
      if (error?.message) error.message += ' Please try again.';
      error = result.error;
    } else if (result.paymentIntent.status === 'succeeded') {
      await goto(routes.SUPERFAN_THANK_YOU);
      // payment succeeded, wait for the user object to update
    }
    // In any case, we're done processing.
    processingPayment = false;
  };

  // Subscribe to user state changes
  let unsubscribeFromUser = user.subscribe((newUserData) => {
    if (newUserData && hasActiveSubscription(newUserData)) {
      selectedLevel = getSubLevelFromUser(newUserData);
    }
  });

  const reloadStripe = async () => {
    // Load the Stripe payment elements
    stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  };

  onMount(async () => {
    // todo: validate priceID
    if (!$user) {
      notify.warning('You need to be logged in!', 10000);
      return goto(routes.SIGN_IN);
    } else {
      if (hasActiveSubscription($user)) {
        // Make sure the correct price is shown, even if the user re-entered another price page
        selectedLevel = getSubLevelFromUser($user);
        return;
      }

      // No active subscription: check if we got redirected from a succesful or failed payment
      // Relevant for bancontact and other redirect methods.
      //
      const searchParams = new URLSearchParams(document.location.search);
      if (searchParams.get('payment_intent')) {
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
        if (searchParams.get('redirect_status')) {
          const status = searchParams.get('redirect_status');
          const clientSecretFromError = searchParams.get('payment_intent_client_secret');
          processingPayment = false;
          switch (status) {
            case 'failed':
              error = new Error('Something went wrong with your payment, please try again.');
              if (clientSecretFromError) {
                clientSecret = clientSecretFromError;
              }
              await reloadStripe();
              break;
            case 'succeeded':
              await goto(routes.SUPERFAN_THANK_YOU);
              break;
          }
          return;
        }
      }

      if (!selectedLevel) {
        console.error("Didn't select, or couldn't find, a price level");
        return;
      }

      try {
        const { data } = await timeout(
          createOrRetrieveUnpaidSubscription({ priceId: selectedLevel.stripePriceId }),
          // In case an invoice is changed, it takes longer than 4 seconds
          10000
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
          setTimeout(() => {
            error = new Error(
              `Something went wrong in our systems. Please contact ${SUPPORT_EMAIL} and we'll help you asap! Sorry for the trouble!`
            );
          }, 3000);
          return;
        } else {
          processingPayment = false;
          console.error(firebaseError);
          error = new Error(
            'Something went wrong when loading our payments service. Please try reloading the page.'
          );
        }
      }

      await reloadStripe();
    }
  });

  onDestroy(() => {
    unsubscribeFromUser();
  });
</script>

<svelte:head>
  <title>{$_('account.title')} | Welcome To My Garden</title>
</svelte:head>

{#if selectedLevel}
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
          <span class="method-title">Payment method</span>
          <PaymentElement
            options={{ paymentMethodOrder: ['bancontact', 'card', 'sepa_debit', 'ideal'] }}
          />
        </Elements>
        <div class="payment-button">
          <div>
            <Button type="submit" uppercase small orange arrow>Pay</Button>
            {#if processingPayment}
              <p>Processing...</p>
            {/if}
          </div>
        </div>
      </form>
    {:else if !error}
      <p>Loading...</p>
    {/if}
  {:else if $user && hasActiveSubscription($user)}
    <!-- Subscription block -->
    <!-- Show status -->
    You're subscribed!
    {#if requestedLevel && selectedLevel && requestedLevel.stripePriceId !== selectedLevel.stripePriceId}
      We currently don't support switching to a different price, working on it!
    {/if}
  {:else}
    No user!
    <!-- else content here -->
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
    justify-content: center;
  }

  .payment-button :global(button) {
    width: 10rem;
  }

  .error {
    color: var(--color-danger);
  }
</style>

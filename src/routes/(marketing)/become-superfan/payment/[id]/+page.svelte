<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onDestroy, onMount } from 'svelte';
  import { user } from '@/lib/stores/auth';
  import type { PageData } from './$types';
  import SuperfanLevel from '@/routes/(marketing)/_components/SuperfanLevel.svelte';
  import { goto } from '@/lib/util/navigate';
  import routes from '@/lib/routes';
  import {
    loadStripe,
    type Stripe,
    type StripeElements,
    type StripeError
  } from '@stripe/stripe-js';
  import { Elements, PaymentElement } from 'svelte-stripe';
  import { createOrRetrieveUnpaidSubscription } from '@/lib/api/functions';
  import { timeout } from '@/lib/util/timeout';
  import {
    hasActiveSubscription,
    getSubLevelFromUser,
    getSubLevelBySlug
  } from '../../subscription-utils';
  import PaddedSection from '@/routes/(marketing)/_components/PaddedSection.svelte';
  import type { SuperfanLevelData } from '@/routes/(marketing)/_static/superfan-levels';

  // TODO: if you subscribe & unsubscribe in 1 session without refreshing, no new sub will be auto-generated
  // we could fix this by detecting changes to the user (if we go from subscribed -> unsubscribed)
  // or by keeping state on whether the payment module is shown
  // (if new state: not shown, not subscribed -> create new sub and show element)

  export let data: PageData;

  let stripe: Stripe | null = null;

  let elements: StripeElements;
  // payment intent client secret
  let clientSecret: string | null = null;
  let processing: boolean = false;
  let error: StripeError | Error | null = null;

  let selectedLevel: SuperfanLevelData | undefined = data.params.id
    ? getSubLevelBySlug(data.params.id)
    : undefined;

  let requestedLevel = selectedLevel;

  const submit = async () => {
    if (!stripe || !clientSecret) return;
    // avoid processing duplicates
    if (processing) return;
    processing = true;
    // confirm payment with stripe
    const { protocol, hostname, port } = document.location;
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      // todo
      confirmParams: {
        // redirect to the same page
        // TODO: redirect to /become-superfan/thank-you, on success only!
        return_url: `${protocol}//${hostname}:${port}/become-superfan/payment`
      }
    });
    // log results, for debugging
    console.log({ result });
    if (result.error) {
      // payment failed, notify user
      error = result.error;
      processing = false;
    } else {
      // payment succeeded, wait for the user to update
    }
  };

  // Subscribe to user state changes
  let unsubscribeFromUser = user.subscribe((newUserData) => {
    if (newUserData && hasActiveSubscription(newUserData)) {
      selectedLevel = getSubLevelFromUser(newUserData);
    }
  });

  onMount(async () => {
    // todo: validate priceID
    if (!$user) {
      return goto(routes.SIGN_IN);
    } else {
      if (hasActiveSubscription($user)) {
        // Make sure the correct price is shown, even if the user re-entered another price page
        selectedLevel = getSubLevelFromUser($user);
        return;
      }

      if (!selectedLevel) {
        console.error("Didn't select, or couldn't find, a price level");
        return;
      }

      try {
        const { data } = await timeout(
          createOrRetrieveUnpaidSubscription({ priceId: selectedLevel.stripePriceId })
        );
        clientSecret = data.clientSecret;
      } catch (firebaseError: any) {
        // if (firebaseError.code && firebaseError.code === 'functions/already-exists') {
        if (firebaseError.error && firebaseError.error.message == 'ALREADY_EXISTS') {
          // This means we're already subscribed and no payment is due
          // Wait until the User gets updated.
          // TODO some kind of loading indication? Or a "processing"?
          return;
        } else {
          processing = false;
          error = new Error('Something went wrong when loading our payments service.');
        }
      }

      // Load the Stripe payment elements
      stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
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
  <PaddedSection>
    <SuperfanLevel item={selectedLevel} />
  </PaddedSection>
{/if}
<PaddedSection>
  {#if $user && selectedLevel && !hasActiveSubscription($user)}
    {#if error}
      <p class="error">{error.message} Please try again.</p>
    {/if}
    {#if stripe && clientSecret}
      <form on:submit|preventDefault={submit}>
        <Elements {stripe} {clientSecret} bind:elements>
          <PaymentElement />
        </Elements>
        <button type="submit">Pay</button>
      </form>
    {:else if !error}
      Loading...
    {/if}
  {:else if $user && hasActiveSubscription($user)}
    <!-- Show status -->
    You're subscribed!
    {#if requestedLevel && selectedLevel && requestedLevel.stripePriceId !== selectedLevel.stripePriceId}
      We currently don't support switching to a different price from here, working on it!
    {/if}
  {:else}
    No user!
    <!-- else content here -->
  {/if}
</PaddedSection>

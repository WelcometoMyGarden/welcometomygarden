<script lang="ts">
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import { Elements, PaymentElement } from 'svelte-stripe';
  import LevelSummary from './payment/LevelSummary.svelte';
  import {
    loadStripe,
    type CheckoutLocale,
    type Stripe,
    type StripeElementLocale,
    type StripeElements,
    type StripeError
  } from '@stripe/stripe-js';
  import { page } from '$app/state';
  import { locale, _ } from 'svelte-i18n';
  import logger from '$lib/util/logger';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/UI';
  import { anchorText } from '$lib/util/translation-helpers';
  import * as Sentry from '@sentry/sveltekit';
  import type { SuperfanLevelData } from '$lib/components/Membership/superfan-levels';

  type Props = {
    payment_intent_client_secret: string;
    selectedLevel: SuperfanLevelData;
    onPaymentSucceeded: () => void;
    name?: string;
    email?: string;
    returnUrl: string;
  };

  let {
    payment_intent_client_secret,
    selectedLevel,
    onPaymentSucceeded,
    name,
    email,
    returnUrl
  }: Props = $props();

  let stripe: Stripe | null = $state(null);
  let elements: StripeElements | undefined = $state();

  let elementsSpan: Sentry.Span | null = $state(null);
  let paymentElementReady = $state(false);

  // - payment_intent_client_secret
  // - payment_intent : the pi_... id
  // - redirect_status : 'succeeded' | 'failed' | 'pending' (= processing, like for SEPA)
  // This is also given by the modal parent page
  let { redirect_status } = $derived(Object.fromEntries(page.url.searchParams.entries()));

  $effect(() => {
    if (page.url.searchParams.get('payment_intent_client_secret')) {
      payment_intent_client_secret = page.url.searchParams.get('payment_intent_client_secret')!;
    }
  });

  let processingPayment = $state(false);
  let error: StripeError | Error | null = $state(null);

  let shouldShowPaymentElements = $derived(
    payment_intent_client_secret && (redirect_status == null || redirect_status == 'failed')
  );

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!stripe || !payment_intent_client_secret || !elements) return;
    // avoid processing duplicates
    if (processingPayment) return;
    processingPayment = true;
    // confirm payment with stripe
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        // Redirect to the current page, passing on the continueUrl
        return_url: returnUrl,
        payment_method_data: {
          billing_details: {
            email
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
      await onPaymentSucceeded();
      // payment succeeded, wait for the user object to update
    }
    // In any case, we're done processing.
    processingPayment = false;
  };

  const reloadStripe = async () => {
    elementsSpan = Sentry.startSpanManual(
      { name: 'Stripe Elements Load', op: 'stripe.elements.load' },
      (span) => (elementsSpan = span)
    );
    // Load the Stripe payment elements
    // TODO: can we fix this TS locale `as` hack? Verify that our input locales are always valid?
    logger.log('(Re)loading stripe if needed');

    stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
      // Note: this will use e.g. Polish if it were set, not just supported languages
      locale: ($locale as StripeElementLocale | CheckoutLocale) || 'auto'
    });
  };

  // Note: this assumes a value for payment_intent_client_secret on mount
  onMount(async () => {
    // Parse search params
    if (redirect_status === 'failed') {
      error = new Error($_('payment-superfan.payment-section.errors.payment-error'));
    }
    if (shouldShowPaymentElements) {
      await reloadStripe();
    }
  });
</script>

<PaddedSection>
  <ul>
    <li><a href="calshow://test">Test calshow link</a></li>
    <li><a href="wtmg://test">Test wtmg:// link</a></li>
    <li><a href="https://staging.welcometomygarden.org/">Test universal link</a></li>
  </ul>
</PaddedSection>
{#if selectedLevel}
  <PaddedSection className="app-payment-summary-section summary-section" desktopOnly>
    <LevelSummary level={selectedLevel} />
  </PaddedSection>
{/if}
{#if shouldShowPaymentElements && stripe}
  <PaddedSection topMargin={false}>
    {#if error}
      <p class="error">{error.message}</p>
    {/if}
    <form onsubmit={submit}>
      <Elements {stripe} clientSecret={payment_intent_client_secret!} bind:elements>
        <span class="method-title">{$_('payment-superfan.payment-section.payment-method')}</span>
        <PaymentElement
          onready={() => {
            elementsSpan?.end();
            paymentElementReady = true;
          }}
          paymentMethodOrder={['bancontact', 'card', 'ideal', 'sepa_debit']}
          terms={{ bancontact: 'never', sepaDebit: 'never', card: 'never', ideal: 'never' }}
          defaultValues={{
            billingDetails: {
              name,
              email
            }
          }}
          fields={{
            billingDetails: {
              email: 'never'
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
                href: '/terms/terms-of-use',
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
  </PaddedSection>
{:else if payment_intent_client_secret && (redirect_status === 'succeeded' || redirect_status == 'pending')}
  <PaddedSection topMargin={false}>
    <!-- Success: the modal host should detect this, and immediately close the modal -->
    <p>Success! Taking you back to the app...</p>
  </PaddedSection>
{:else}
  <!-- Any other situation like when you just open the page: loading -->
  <PaddedSection>
    <p class="loading-text">{$_('payment-superfan.payment-section.loading')}</p>
  </PaddedSection>
{/if}

<style>
  .method-title {
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

  /* To counteract the default mobile removal of top padding in PaddedSection */
  .loading-text {
    margin-top: var(--section-inner-padding);
  }
</style>

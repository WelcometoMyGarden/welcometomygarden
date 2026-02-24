<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { anchorText } from '$lib/util/translation-helpers';
  import {
    loadStripe,
    type CheckoutLocale,
    type Stripe,
    type StripeElementLocale,
    type StripeElements,
    type StripeError
  } from '@stripe/stripe-js';
  import { Elements, PaymentElement } from 'svelte-stripe';
  import { Button } from '$lib/components/UI';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import logger from '$lib/util/logger';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import LevelSummary from '$routes/[[lang]]/(stateful)/become-member/payment/LevelSummary.svelte';
  import { getSubLevelBySlug } from '$lib/components/Membership/subscription-utils';
  import { type SuperfanLevelData } from '$lib/components/Membership/superfan-levels';

  let stripe: Stripe | null = $state(null);
  let elements: StripeElements | undefined = $state();

  // note: on iOS, it doesn't seem to be possible to inspect the in-app browser modal via Safari
  //  So we can't debug or see console logs. This is a dirty debugging tactic.
  // TODO: guard this with svelte development mode conditionals, rather than comments
  // let debugMessage: string = $state('');

  let processingPayment = false;
  let error: StripeError | Error | null = $state(null);

  // default Stripe redirect search params:

  // - payment_intent_client_secret
  // - payment_intent : the pi_... id
  // - redirect_status : 'succeeded' | 'failed' | 'pending' (= processing, like for SEPA)
  // This is also given by the modal parent page
  let payment_intent_client_secret: string | null = $state(null);
  let redirect_status: string | null = $state(null);

  let name: string | undefined = $state();
  let email: string | undefined = $state();

  let shouldShowPaymentElements = $derived(
    payment_intent_client_secret && (redirect_status == null || redirect_status == 'failed')
  );

  let slug: string | undefined = $state();
  let selectedLevel: SuperfanLevelData | undefined = $derived(
    slug ? getSubLevelBySlug(slug) : undefined
  );

  onMount(async () => {
    // Parse search params
    ({ name, email, slug, payment_intent_client_secret, redirect_status } = Object.fromEntries(
      page.url.searchParams.entries()
    ) as any);
    if (redirect_status === 'failed') {
      error = new Error($_('payment-superfan.payment-section.errors.payment-error'));
    }
    if (shouldShowPaymentElements) {
      await reloadStripe();
    }
  });

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!elements) {
      logger.warn('Elements not loaded yet upon native app submit');
      return;
    }
    if (!name || !email || !slug) {
      logger.warn('Missing name, email or slug prop from query params');
      return;
    }
    logger.debug('Submitting.....');
    if (!stripe || !payment_intent_client_secret) {
      logger.warn('Submitting before Stripe was loaded, ignoring submission');
      // debugMessage = `can't submit ${stripe} ${payment_intent_client_secret}`;
      return;
    }
    // debugMessage = `submitting ${payment_intent_client_secret}`;
    let result;

    try {
      const returnUrl = new URL(window.location.toString());
      returnUrl.search = `?${new URLSearchParams({ name, email, slug }).toString()}`;
      result = await stripe.confirmPayment({
        elements,
        // note: it looks like if you set this to 'always', you need to
        // call stripe.submit() before stripe.confirmpayment()
        redirect: 'if_required',
        confirmParams: {
          // Redirect to the current page, passing on the continueUrl
          return_url: returnUrl.toString(),
          payment_method_data: {
            billing_details: {
              email
            }
          }
        }
      });

      // If we're here, no redirect happened
      logger.log('Stripe confirmation result', { result });
      if (result.error) {
        // payment failed, notify user
        if (error?.message) error.message += ' Please try again.';
        error = result.error;
      } else if (
        result.paymentIntent.status === 'succeeded' ||
        result.paymentIntent.status === 'processing'
      ) {
        // We depend on redirects to detect success or f
        // TODO refactor this to 'always'
        // This part of the code is only reached by payment methods that do not redirect!
        // In case of "processing" (part of the SEPA flow), assumme provisional success
        logger.log('payment intent status:', result.paymentIntent.status);
        logger.log('stripe.confirmPayment succeeded, redirecting to a page');
        const successUrl = new URL(window.location.toString());
        successUrl.searchParams.set('redirect_status', 'succeeded');
        window.location.replace(successUrl);
      }
      logger.log(result);
    } catch (e) {
      // debugMessage = `${payment_intent_client_secret}\n\n${(e as any)?.toString()}`;
      logger.error('Unexpected error when confirming a native app payment');
    }
  };

  const reloadStripe = async () => {
    // Load the Stripe payment elements
    // TODO: can we fix this TS locale `as` hack? Verify that our input locales are always valid?
    logger.log('(Re)loading stripe if needed');

    stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
      // Note: this will use e.g. Polish if it were set, not just supported languages
      locale: ($locale as StripeElementLocale | CheckoutLocale) || 'auto'
    });
  };
</script>

<!-- {#if debugMessage}
  <PaddedSection>
    <p>{debugMessage}</p>
  </PaddedSection>
{/if} -->
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
      <Elements {stripe} clientSecret={payment_intent_client_secret} bind:elements>
        <span class="method-title">{$_('payment-superfan.payment-section.payment-method')}</span>
        <PaymentElement
          on:ready={() => {
            // elementsSpan?.end();
            // paymentElementReady = true;
          }}
          options={{
            paymentMethodOrder: ['bancontact', 'card', 'ideal', 'sepa_debit'],
            terms: { bancontact: 'never', sepaDebit: 'never', card: 'never', ideal: 'never' },
            defaultValues: {
              billingDetails: {
                name,
                email
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
  /* TODO: refactor/extract components, this is shared with the payment layout   */
  /* Taken from Stripe's Payment element CSS */
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

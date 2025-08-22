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
  import { page } from '$app/stores';
  let stripe: Stripe | null = null;
  let elements: StripeElements;
  // payment intent client secret
  let processingPayment = false;
  let error: StripeError | Error | null = null;
  let clientSecret: string | null = null;

  let name: string | undefined;
  let email: string | undefined;

  onMount(async () => {
    ({ clientSecret, name, email } = Object.fromEntries($page.url.searchParams.entries()) as any);
    await reloadStripe();
  });

  const submit = async () => {
    console.debug('Submitting.....');
    if (!stripe || !clientSecret) return;
    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        // Redirect to the current page, passing on the continueUrl
        return_url: `${document.location.protocol}//${document.location.hostname}:${
          document.location.port
        }${document.location.pathname}`,
        payment_method_data: {
          billing_details: {
            email
          }
        }
      }
    });
    console.log(result);
  };

  const reloadStripe = async () => {
    // Load the Stripe payment elements
    // TODO: can we fix this TS locale `as` hack? Verify that our input locales are always valid?
    console.log('Reloading stripe');
    stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
      // Note: this will use e.g. Polish if it were set, not just supported languages
      locale: ($locale as StripeElementLocale | CheckoutLocale) || 'auto'
    });
  };
</script>

This is the in-app payment page

{#if stripe && clientSecret}
  <form on:submit|preventDefault={submit}>
    <Elements {stripe} {clientSecret} bind:elements>
      <span class="method-title">{$_('payment-superfan.payment-section.payment-method')}</span>
      <PaymentElement
        on:ready={() => {
          // elementsSpan?.end();
          // paymentElementReady = true;
        }}
        options={{
          paymentMethodOrder: ['bancontact', 'card', 'ideal', 'sofort'],
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
{:else}
  Loading...
{/if}

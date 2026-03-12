<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/state';
  import { getSubLevelBySlug } from '$lib/components/Membership/subscription-utils';
  import PaymentPage from '$routes/[[lang]]/(stateful)/become-member/PaymentPage.svelte';
  import { onMount } from 'svelte';
  import { stripStripeParams } from '$routes/[[lang]]/(stateful)/become-member/payment/util';
  import { Button } from '$lib/components/UI';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import LoadingPage from '$routes/[[lang]]/(stateful)/become-member/LoadingPage.svelte';
  import { goto, toRelativePart } from '$lib/util/navigate';

  // note: on iOS, it doesn't seem to be possible to inspect the in-app browser modal via Safari
  //  So we can't debug or see console logs. This is a dirty debugging tactic.
  // TODO: guard this with svelte development mode conditionals, rather than comments
  // let debugMessage: string = $state('');

  // default Stripe redirect search params:

  let payment_intent_client_secret: string | undefined = $state();
  let name: string | undefined = $state();
  let email: string | undefined = $state();
  let slug: string | undefined = $state();
  let platform: string | undefined = $state();
  let redirect_status: string | undefined = $state();
  let returnUrl: string | undefined = $state();

  let showContinueInstructions = $state(false);

  /**
   * Transforms the URL into a universal link URL
   * @param url fully qualified url
   */
  function toAppLink(url: URL) {
    const _url = new URL(url);

    // Make sure that the url target is another domain that is still registered as an applink
    // If SFSafariViewController opens a link on the same universal link domain that it's already at,
    // it will not trigger that app link. It will trigger another app link though.
    switch (_url.host) {
      case 'welcometomygarden.org':
        _url.host = 'beta.welcometomygarden.org';
        break;
      default:
        // for beta, staging, other testing URLs...
        _url.host = 'welcometomygarden.org';
    }
    // Override the port to be sure
    _url.port = '';
    return _url;
  }

  $effect(() => {
    ({ name, email, slug, platform, payment_intent_client_secret, redirect_status } =
      Object.fromEntries(page.url.searchParams.entries()));

    if (redirect_status === 'succeeded' || redirect_status === 'pending') {
      setTimeout(() => (showContinueInstructions = true), 10 * 1000);
    }
  });

  onMount(() => {
    const _returnUrl = toAppLink(page.url);
    // Strip Stripe params to avoid duplicates
    stripStripeParams(_returnUrl.searchParams);
    // This is the return URL for redirecting Stripe payment methods
    returnUrl = _returnUrl.toString();
  });

  function paymentSucceeded() {
    // Only called for non-redirecting payment methods

    const url = new URL(page.url);
    stripStripeParams(url.searchParams);
    url.searchParams.append('redirect_status', 'succeeded');
    if (platform === 'android') {
      // On Android, we need to rely on app links to get back to the app since
      // the host page is paused while this tab is open, it won't get updated with
      // the superfan status in the background.
      window.location.assign(toAppLink(url));
    } else {
      // On iOS, we just need to reflect that the payment method worked and show a loading page.
      // The background Capacitor webview will close this SFSafariViewController.
      //
      // Append redirect_status=succeeded to the URL & do a client-side navigation
      // do this instead of a direct assignment to the derived var, since an effect-rerun based
      // on the assignment clears it redirect_status again if it's not in the URL
      goto(toRelativePart(url));
    }
  }

  function successAppLink() {
    // Normally, the returnUrl from onMount is intercepted
    // as a universal/app link by the existing, open payment layout page and handled there.
    //
    // This might fail, especially on iOS. Normally on iOS, the membership detection in the payment
    // layout will close this modal. But in case it doesn't, with this fallback case, the user
    // can still trigger an app link .
    const url = toAppLink(page.url);

    // Avoid duplicates
    stripStripeParams(url.searchParams);

    // It seems like Apple requires window.location.assign or window.open
    // to be called in about < 1 second of clicking a (web?) button
    // Otherwise it will not trigger the universal URL.

    url.searchParams.append('redirect_status', 'succeeded');
    return url.toString();
  }
</script>

{#if redirect_status === 'succeeded' || redirect_status === 'pending'}
  {#if showContinueInstructions}
    <PaddedSection>
      <p class="text-succeeded">
        {$_('payment-superfan.payment-section.app-fallback.success-title')}
      </p>
      <div class="btn-succeeded">
        <Button small centered href={successAppLink()}
          >{$_('payment-superfan.payment-section.app-fallback.continue-button')}</Button
        >
      </div>
    </PaddedSection>
  {:else}
    <LoadingPage />
  {/if}
{:else if slug && name && email && payment_intent_client_secret && returnUrl}
  <PaymentPage
    {payment_intent_client_secret}
    selectedLevel={getSubLevelBySlug(slug!)!}
    {name}
    {email}
    onPaymentSucceeded={paymentSucceeded}
    {returnUrl}
  />
{/if}

<style>
  .btn-succeeded {
    width: 100%;
    display: flex;
  }
  .text-succeeded {
    margin-bottom: 1rem;
    margin-top: 5rem;
    text-align: center;
  }
</style>

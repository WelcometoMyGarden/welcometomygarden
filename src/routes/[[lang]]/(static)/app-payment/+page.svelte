<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/state';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import { getSubLevelBySlug } from '$lib/components/Membership/subscription-utils';
  import PaymentPage from '$routes/[[lang]]/(stateful)/become-member/PaymentPage.svelte';
  import { onMount } from 'svelte';

  // note: on iOS, it doesn't seem to be possible to inspect the in-app browser modal via Safari
  //  So we can't debug or see console logs. This is a dirty debugging tactic.
  // TODO: guard this with svelte development mode conditionals, rather than comments
  // let debugMessage: string = $state('');

  // default Stripe redirect search params:

  let payment_intent_client_secret: string | undefined = $state();
  let name: string | undefined = $state();
  let email: string | undefined = $state();
  let slug: string | undefined = $state();
  let returnUrl: string | undefined = $state();

  onMount(() => {
    ({ name, email, slug, payment_intent_client_secret } = Object.fromEntries(
      page.url.searchParams.entries()
    ));
    const url = new URL(page.url);
    url.search = `?${new URLSearchParams({ name, email, slug }).toString()}`;
    returnUrl = url.toString();
  });

  function paymentSucceeded() {
    console.log('TODO succeeded');
  }
</script>

<!-- {#if debugMessage}
  <PaddedSection>
    <p>{debugMessage}</p>
  </PaddedSection>
{/if} -->
<PaddedSection>
  <ul>
    <li><a href="calshow://test">Test calshow link</a></li>
    <li><a href="wtmg://test">Test wtmg:// link</a></li>
    <li><a href="https://staging.welcometomygarden.org/">Test universal link</a></li>
  </ul>
</PaddedSection>
{#if slug && name && email && payment_intent_client_secret && returnUrl}
  <PaymentPage
    {payment_intent_client_secret}
    selectedLevel={getSubLevelBySlug(slug!)!}
    {name}
    {email}
    onPaymentSucceeded={paymentSucceeded}
    {returnUrl}
  />
{/if}

<style></style>

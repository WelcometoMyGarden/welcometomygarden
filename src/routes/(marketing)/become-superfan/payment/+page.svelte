<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onDestroy, onMount } from 'svelte';
  import { user } from '@/lib/stores/auth';
  import type { PageData } from './[id]/$types';
  import { superfanLevels, type SuperfanLevelData } from '../+page.svelte';
  import { goto } from '@/lib/util/navigate';
  import routes from '@/lib/routes';
  import type User from '@/lib/models/User';


  // TODO REUSE FUNCTIONS

  export let data: PageData;

  let selectedLevel: SuperfanLevelData | undefined = data.params.id
    ? superfanLevels.find((level) => level.id === data.params.id)
    : undefined;

  function hasActiveSubscription(user: User) {
    return typeof user.stripeSubscription === 'object'
      && user.stripeSubscription.status === 'active'
      && user.stripeSubscription.latestInvoiceStatus === 'paid'
  }

  function selectLevelFromSubscription(user: User) {
    if (hasActiveSubscription(user)) {
        // No need to load stripe, display the status instead.
        selectedLevel = superfanLevels.find(level => level.stripePriceId === user?.stripeSubscription!.priceId)
      }
  }

  let unsubscribeFromUser = user.subscribe((newUser) => {
    if (newUser) selectLevelFromSubscription(newUser);
  });

  onMount(async () => {
    // todo: validate priceID
    if (!$user) {
      return goto(routes.SIGN_IN);
    } else {
      if (hasActiveSubscription($user)) {
        // Make sure the correct price is shown, even if the user re-entered another price page
        selectLevelFromSubscription($user)
        return;
      }

      if (!selectedLevel) {
        console.error("Didn't select, or couldn't find, a price level")
        return
      }
    }
  });

  onDestroy(() => {
    unsubscribeFromUser();
  })
</script>

<svelte:head>
  <title>{$_('account.title')} | Welcome To My Garden</title>
</svelte:head>

<!-- TODO: find a way to generalize the wrapper across pages -->
<div class="wrapper">
  {#if $user && hasActiveSubscription($user)}
    <!-- Show status -->
    You're subscribed!
  {:else if $user}
    You don't have an active subscription?
  {:else}
    No user!
    <!-- else content here -->
  {/if}
</div>

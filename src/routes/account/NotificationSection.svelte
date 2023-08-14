<script lang="ts">
  import { locale } from 'svelte-i18n';
  import {
    createPushRegistrationObserver,
    getCurrentSubscription,
    createPushRegistration,
    type PushSubscriptionPOJO,
    deletePushRegistration
  } from '$lib/api/push-registrations';
  import { Button } from '$lib/components/UI';
  import { user } from '$lib/stores/auth';
  import { pushRegistrations } from '$lib/stores/pushRegistrations';
  import type { Unsubscribe } from 'firebase/firestore';
  import { onDestroy, onMount } from 'svelte';

  let unsubscribeFromObserver: null | Unsubscribe = null;
  $: if ($user) {
    // Combining this conditions with the above one somehow doesn't work.
    if (!unsubscribeFromObserver) {
      unsubscribeFromObserver = createPushRegistrationObserver();
    }
  }

  /**
   * null if none found, undefined if loading
   */
  let currentSub: PushSubscriptionPOJO | undefined | null = undefined;

  onMount(async () => {
    try {
      currentSub = (await getCurrentSubscription()) ?? null;
    } catch (e) {
      console.error(e);
      currentSub = null;
    }
  });

  onDestroy(() => {
    if (unsubscribeFromObserver) unsubscribeFromObserver();
    unsubscribeFromObserver = null;
  });

  // your script goes here
</script>

<div>
  <h2>Notifications</h2>
  <table>
    <th />
    {#each $pushRegistrations as { id, createdAt, ua: { browser, device }, subscription: { endpoint } }}
      <tr>
        <td
          >{browser} on {device.model}
          {currentSub?.endpoint === endpoint ? '(current)' : ''}</td
        >
        <td
          >Enabled on {new Intl.DateTimeFormat($locale, { dateStyle: 'medium' }).format(
            createdAt.toDate()
          )}</td
        >
        <td><button on:click={() => deletePushRegistration(id)}>Remove notifications</button></td>
      </tr>
    {/each}
  </table>
  {#if currentSub === null}
    <p>Get push notifications on this browser or device</p>
    <Button uppercase xsmall on:click={() => createPushRegistration()}>Enable notifications</Button>
  {/if}
</div>

<style>
  h2 {
    margin-bottom: 2rem;
    font-weight: 500;
    font-size: 1.8rem;
  }
</style>

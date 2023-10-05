<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    createPushRegistration,
    hasNotificationSupportNow,
    canHaveNotificationSupport,
    isNotificationEligible
  } from '$lib/api/push-registrations';
  import { Button } from '$lib/components/UI';
  import {
    loadedPushRegistrations,
    pushRegistrations,
    currentNativeSubStore
  } from '$lib/stores/pushRegistrations';
  import { isMobileDevice } from '$lib/util/uaInfo';
  import NotificationPrompt from '$routes/chat/[name]/[chatId]/NotificationPrompt.svelte';
  import PushRegistrationEntry from '$routes/chat/[name]/PushRegistrationEntry.svelte';
  import { PushRegistrationStatus } from '$lib/types/PushRegistration';
  import { anchorText } from '$lib/util/translation-helpers';

  /** Note: this registration could be marked for deletion  */
  $: currentPushRegistration = $pushRegistrations.find(
    (pR) => pR.subscription.endpoint === $currentNativeSubStore?.endpoint
  );
  $: currentActivePushRegistration = $pushRegistrations.find(
    (pR) =>
      pR.subscription.endpoint === $currentNativeSubStore?.endpoint &&
      pR.status === PushRegistrationStatus.ACTIVE
  );
  $: otherSubscriptions = $pushRegistrations.filter(
    (pR) =>
      pR.status === PushRegistrationStatus.ACTIVE &&
      pR.subscription.endpoint !== $currentNativeSubStore?.endpoint
  );
</script>

<section>
  <h2>{$_('account.notifications.title')}</h2>
  {#if !isMobileDevice && $loadedPushRegistrations && $pushRegistrations.length === 0 && $currentNativeSubStore === null}
    <!-- Show desktop suggestion banner -->
    <NotificationPrompt permanent />
  {:else if ($loadedPushRegistrations && $pushRegistrations.length > 0) || (isMobileDevice && isNotificationEligible())}
    <ul>
      <!-- Show options for the current device if it supports notifications, including current sub options -->
      {#if $loadedPushRegistrations && isMobileDevice && isNotificationEligible()}
        <li>
          <PushRegistrationEntry
            pushRegistration={currentActivePushRegistration}
            currentSub={$currentNativeSubStore}
          />
        </li>
      {/if}
      <!-- Show other push registrations if available (also on desktop)-->
      {#each otherSubscriptions as pushRegistration (pushRegistration.id)}
        <li><PushRegistrationEntry {pushRegistration} currentSub={$currentNativeSubStore} /></li>
      {/each}
    </ul>
  {/if}
  {#if isMobileDevice && !hasNotificationSupportNow() && !canHaveNotificationSupport()}
    <p>
      {$_('account.notifications.unsupported', {
        values: {
          link: anchorText({
            href: $_('account.notifications.ios16-link'),
            linkText: $_('account.notifications.ios16-check')
          })
        }
      })}
    </p>
  {:else if $loadedPushRegistrations && $currentNativeSubStore != null && !currentPushRegistration}
    <!-- TODO: edge cases with restoring a marked for deletion PR? -->
    <!-- TODO: Test the below, push-registrations observer is now refactored to
      try to unsubscribe any remnant native subscriptions, if they are missing from Firebase
      (test by force-deleting from the DB?)
      In that works well,
      If it fails, we should make sure that the normal registration procdure above can handle
      an already-available PushSubscription.
      With both these conditions, this case can be removed since it's already handled there.
    -->
    <!-- If we locally have a subscription that isn't available remotely, then add it.
This normally shouldn't happen, except when a database was wiped (in testing) -->
    <p>Your current browser already allows WTMG notifications, but WTMG will not send them.</p>
    <Button uppercase xsmall on:click={() => createPushRegistration()}>Restore notifications</Button
    >
  {/if}
</section>

<style>
  section {
    margin-top: 2rem;
  }
  h2 {
    margin-bottom: 2rem;
    font-weight: 500;
    font-size: 1.8rem;
  }

  /* dividers */
  li:not(:last-of-type)::after {
    content: '';
    display: block;
    background: var(--color-gray);
    width: 100%;
    margin: 1.5rem 0;
    height: 2px;
  }
</style>

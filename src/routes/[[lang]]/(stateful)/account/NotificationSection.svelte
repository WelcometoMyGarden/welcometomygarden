<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    hasAnyNativePushRegistration,
    isNativePushRegistration,
    isWebPushRegistration
  } from '$lib/util/push-registrations';
  import {
    loadedPushRegistrations,
    pushRegistrations,
    currentWebPushSubStore,
    deviceId
  } from '$lib/stores/pushRegistrations';
  import { isMobileDevice, isMobileWebDevice, isNative } from '$lib/util/uaInfo';
  import NotificationPrompt from '$routes/[[lang]]/(stateful)/chat/[name]/[chatId]/NotificationPrompt.svelte';
  import PushRegistrationEntry from '$routes/[[lang]]/(stateful)/chat/[name]/PushRegistrationEntry.svelte';
  import { anchorText } from '$lib/util/translation-helpers';
  import NewBadge from '$lib/components/Nav/NewBadge.svelte';
  import { PushRegistrationStatus } from '$lib/types/PushRegistration';
  import type { Timestamp } from 'firebase/firestore';

  /** A push registration linked to the current device or browser.
   *  Note: this registration could be marked for deletion */
  let currentPushRegistration = $derived(
    $pushRegistrations.find((pR) => {
      return (
        (isWebPushRegistration(pR) &&
          pR.subscription.endpoint === $currentWebPushSubStore?.endpoint) ||
        (isNativePushRegistration(pR) && pR.deviceId == $deviceId)
      );
    })
  );

  let currentActivePushRegistration = $derived(
    currentPushRegistration?.status === PushRegistrationStatus.ACTIVE
      ? currentPushRegistration
      : undefined
  );

  let activePushRegistrations = $derived(
    $pushRegistrations.filter((pR) => pR.status === PushRegistrationStatus.ACTIVE)
  );

  let otherActivePushRegistrations = $derived(
    activePushRegistrations
      .filter((pR) => pR.id !== currentActivePushRegistration?.id)
      // Sort reverse chronologically
      .sort(
        (a, b) => (b.refreshedAt as Timestamp).toMillis() - (a.refreshedAt as Timestamp).toMillis()
      )
  );

  let shouldShowNotificationPrompt = $derived(
    // Never show on native, since we enable notifications here
    !isNative &&
      // Always show on mobile web devices
      (isMobileWebDevice ||
        // Show on desktop browsers if there is no native push registered yet
        (!isMobileDevice && $loadedPushRegistrations && !$hasAnyNativePushRegistration))
  );

  /**
   * Whether the user might still "care" about web push because they interacted with it before.
   * We exclude marked_for_deletion web PRs since that shows an absence of care, or a migrated account.
   */
  let hasAnyActiveOrErroredWebPushRegistration = $derived(
    $pushRegistrations.some(
      (pR) =>
        isWebPushRegistration(pR) &&
        (pR.status === PushRegistrationStatus.ACTIVE || PushRegistrationStatus.FCM_ERRORED)
    )
  );
</script>

<section>
  <h2>{$_('account.notifications.title')}{' '}<NewBadge>{$_('generics.new')}</NewBadge></h2>
  <!-- Show the app suggestion banner for the native app, but only on non-native devices
        when the user doesn't have any native PR yet -->
  <!-- Note: on native, we *instead* show PushRegistrationEntry to control notifs on the device  -->
  {#if shouldShowNotificationPrompt}
    <NotificationPrompt permanent />
  {/if}
  <!-- On native, always show controls to *enable* the current device on top of the "manage active" title
      Note that this will move down after enabling.
      It will NOT apply to web push anymore (new web push devices can't be enabled anymore) -->
  {#if isNative && !currentActivePushRegistration}
    <PushRegistrationEntry pushRegistration={currentActivePushRegistration} />
  {/if}
  <!-- If there are any active push registrations (this one or others), show it in a list under a title -->
  {#if otherActivePushRegistrations.length > 0 || !!currentActivePushRegistration}
    <h3>{$_('account.notifications.manage')}</h3>
    <ul>
      <!-- Show the current device's push registration on top as part of the activated extensions
        Note that this still applies to Web Push.
       -->
      {#if currentActivePushRegistration}
        <li>
          <PushRegistrationEntry pushRegistration={currentActivePushRegistration} />
        </li>
      {/if}
      {#each otherActivePushRegistrations as pushRegistration (pushRegistration.id)}
        <li>
          <PushRegistrationEntry {pushRegistration} />
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Show our external FAQ page if the user has web push registrations,
       but no native push registrations -->
  {#if $loadedPushRegistrations && hasAnyActiveOrErroredWebPushRegistration && !$hasAnyNativePushRegistration}
    <p class="faqlink">
      {@html $_('account.notifications.questions', {
        values: {
          faqLink: anchorText({
            href: $_('push-notifications.prompt.helpcenter-url'),
            linkText: $_('account.notifications.questions-faqlink-text'),
            class: 'link'
          })
        }
      })}
    </p>
  {/if}
</section>

<style>
  section {
    margin: 2rem 0 4rem 0;
  }

  .faqlink {
    margin-top: 1rem;
  }

  h2 {
    margin-bottom: 2rem;
    font-weight: 500;
    font-size: 1.8rem;
  }

  h3 {
    font-size: 1.6rem;
    line-height: 1.4;
    margin: 3rem 0 1rem 0;
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

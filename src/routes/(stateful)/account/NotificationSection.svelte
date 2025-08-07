<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    handleNotificationEnableAttempt,
    isNotificationEligible
  } from '$lib/api/push-registrations/index';
  import {
    hasWebPushNotificationSupportNow,
    isNativePushRegistration,
    isWebPushRegistration
  } from '$lib/util/push-registrations';
  import { Button } from '$lib/components/UI';
  import {
    loadedPushRegistrations,
    pushRegistrations,
    currentWebPushSubStore,
    deviceId
  } from '$lib/stores/pushRegistrations';
  import { iDeviceInfo, isMobileDevice, isNative } from '$lib/util/uaInfo';
  import NotificationPrompt from '$routes/(stateful)/chat/[name]/[chatId]/NotificationPrompt.svelte';
  import PushRegistrationEntry from '$routes/(stateful)/chat/[name]/PushRegistrationEntry.svelte';
  import { anchorText } from '$lib/util/translation-helpers';
  import NewBadge from '$lib/components/Nav/NewBadge.svelte';
  import { hasDeniedWebPushNotifications } from '$lib/api/push-registrations/webpush';
  import { PushRegistrationStatus } from '$lib/types/PushRegistration';

  $: currentPushRegistration = $pushRegistrations.find((pR) => {
    return (
      (isWebPushRegistration(pR) &&
        pR.subscription.endpoint === $currentWebPushSubStore?.endpoint) ||
      (isNativePushRegistration(pR) && pR.deviceId == $deviceId)
    );
  });
  $: currentActivePushRegistration =
    currentPushRegistration?.status === PushRegistrationStatus.ACTIVE
      ? currentPushRegistration
      : undefined;

  $: otherSubscriptions = $pushRegistrations.filter(
    (pR) =>
      pR.status === PushRegistrationStatus.ACTIVE && pR.id !== currentActivePushRegistration?.id
  );

  /**
   * If the current browser SW has access to a native PushRegistration that isn't known in Firebase.
   *
   * This is an unexpected dirty state. It might happen in Firefox on Android, which doesn't seem to do
   * cleanup in the same way as Chrome.
   */
  $: leftoverLocalWebPushSub =
    $loadedPushRegistrations && $currentWebPushSubStore != null && !currentPushRegistration;

  const { isIDevice, currentAppleDevice } = iDeviceInfo!;

  const hasActivePushRegistrationWithModel = (model: string) =>
    !!otherSubscriptions.find(({ ua }) => ua.device?.model === model);

  /**
   * Since (1) iDevices can only enable Web Push in Home Screen apps, and (2) Home Screen apps
   * don't share any state with their browser counterparts, we can get in the confusing UX situation of
   * a user opening WTMG in their iDevice browser after going through the setup procedure,
   * seeing that they have an "other" active iDevice, and that their current device is _still_ not enabled.
   *
   * !! We make an assumption here that most people only have 1 iPhone, and/or 1 iPad, and when the above situation occurs,
   * we choose to hide the current browser in the account settings to prevent confusion.
   */
  $: isNonPWAIDeviceWithActivePWA =
    // TODO: just added this isNative line here, how to handle this better?
    !isNative &&
    !currentActivePushRegistration &&
    isIDevice &&
    !hasWebPushNotificationSupportNow() &&
    ((currentAppleDevice === 'iPhone' && hasActivePushRegistrationWithModel('iPhone')) ||
      (currentAppleDevice === 'iPad' && hasActivePushRegistrationWithModel('iPad')));
</script>

<section>
  <h2>{$_('account.notifications.title')}{' '}<NewBadge>{$_('generics.new')}</NewBadge></h2>
  <!-- Error messages/warnings on top -->

  {#if isMobileDevice && !isNotificationEligible()}
    <!-- Unsupported mobile device -->
    {#if isIDevice}
      {@html $_('account.notifications.unsupported-ios', {
        values: {
          link: anchorText({
            href: $_('account.notifications.ios16-link'),
            linkText: $_('account.notifications.ios16-check')
          })
        }
      })}
    {:else}
      <p>{@html $_('account.notifications.unsupported-android')}</p>
    {/if}
  {:else if leftoverLocalWebPushSub}
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
    <Button uppercase xsmall on:click={() => handleNotificationEnableAttempt()}
      >Restore notifications</Button
    >
  {:else if isMobileDevice && hasWebPushNotificationSupportNow() && hasDeniedWebPushNotifications()}
    <!-- TODO: how to capture this on mobile: that the local phone has denied permissions + new copy -->
    <!-- Browser has already explicitly denied permissions -->
    <p>
      {@html $_('push-notifications.error.permission-denied', {
        values: {
          faqLink: anchorText({
            href: $_('push-notifications.error.permission-denied-faq-link'),
            linkText: $_('push-notifications.error.permission-denied-faq-text'),
            class: 'link'
          })
        }
      })}
    </p>
  {/if}

  <!-- Notification config -->
  {#if !(isNative || isMobileDevice) && $loadedPushRegistrations && $pushRegistrations.length === 0 && $currentWebPushSubStore === null}
    <!-- Show desktop suggestion banner -->
    <NotificationPrompt permanent />
  {:else if (isMobileDevice && isNotificationEligible()) || ($loadedPushRegistrations && otherSubscriptions.length > 0)}
    <!-- Show options for the current device if it supports notifications, including current sub options -->

    <!-- Show the current device on top, if it's not activated yet -->
    {#if isMobileDevice && isNotificationEligible() && !currentActivePushRegistration && !hasDeniedWebPushNotifications() && !isNonPWAIDeviceWithActivePWA}
      <PushRegistrationEntry pushRegistration={currentActivePushRegistration} />
    {/if}
    <!-- Show the title for managing active push registration, if any are active (current or not) -->
    {#if otherSubscriptions.length > 0 || !!currentActivePushRegistration}
      <h3>{$_('account.notifications.manage')}</h3>
      <!-- Show other push registrations if available (also on desktop)-->
      <ul>
        <!-- Show the current active push registration as part of the activated extensions -->
        {#if currentActivePushRegistration}
          <li>
            <PushRegistrationEntry pushRegistration={currentActivePushRegistration} />
          </li>
        {/if}
        {#each otherSubscriptions as pushRegistration (pushRegistration.id)}
          <li>
            <PushRegistrationEntry {pushRegistration} />
          </li>
        {/each}
      </ul>
    {/if}
  {/if}

  <!-- FAQ link -->
  {#if isMobileDevice && !hasDeniedWebPushNotifications()}
    <!-- Show with some exclusions:
      - desktop will already have a link to the FAQ
      - certain error messages also have a link to the FAQ already
     -->
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

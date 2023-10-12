<script lang="ts">
  import {
    deletePushRegistration,
    type PushSubscriptionPOJO,
    isNotificationEligible,
    handleNotificationEnableAttempt
  } from '$lib/api/push-registrations';
  import { Button, Icon } from '$lib/components/UI';
  import IconButton from '$lib/components/UI/IconButton.svelte';
  import { androidIcon, appleIcon, mobileDeviceIcon, trashIcon } from '$lib/images/icons';
  import { isEnablingLocalPushRegistration } from '$lib/stores/pushRegistrations';
  import { PushRegistrationStatus, type LocalPushRegistration } from '$lib/types/PushRegistration';
  import { isIDeviceF, isMobileDevice, uaInfo } from '$lib/util/uaInfo';
  import { locale, _ } from 'svelte-i18n';
  export let pushRegistration: LocalPushRegistration | undefined = undefined;
  export let currentSub: PushSubscriptionPOJO | undefined | null = undefined;

  // if the pushRegistration prop is undefined, fill destructured properties with null (except ua)
  $: ({
    id,
    refreshedAt,
    ua: { os, browser, device },
    subscription: { endpoint }
  } = pushRegistration || {
    id: null,
    createdAt: null,
    refreshedAt: null,
    ua: {
      os: uaInfo!.os.name,
      browser: uaInfo!.browser.name,
      device: uaInfo!.device
    },
    subscription: { endpoint: null }
  });

  $: pureBrowserName = browser?.replace('Mobile ', '');

  /**
   * Whether this registration exists in Firebase
   */
  $: isRegisteredInFirebase = !!id;
  $: canSuggestToTurnOnNotifsForCurrentDevice =
    // ... we're on a mobile device
    isMobileDevice! &&
    // ... that currently doesn't have a sub
    currentSub === null &&
    // ... and could have notifications
    isNotificationEligible() &&
    // ... and hasn't been registered yet in Firebase
    !isRegisteredInFirebase;

  // Note: this relies on the CURRENT device. It should accept
  $: isIDevice = isIDeviceF(os ?? '');
</script>

<div class="entry">
  <div class="header">
    <Icon icon={isIDevice ? appleIcon : os === 'Android' ? androidIcon : mobileDeviceIcon} />
    <div class="copy">
      <!-- Don't show "Safari on" on iDevices, since people might be confused if they added with Chrome/FF on iOS -->
      {#if !isIDevice}
        {pureBrowserName}
        {$_('generics.on')}
      {/if}
      {device.vendor && device.vendor !== 'Apple' ? `${device.vendor} ` : ''}{device.model ??
        os ??
        $_('account.notifications.unknown')}
      <div class="extra-info">
        {#if !isRegisteredInFirebase || currentSub?.endpoint === endpoint}
          {$_('account.notifications.current')}
        {:else if refreshedAt}
          {$_('account.notifications.last-seen')}
          {new Intl.DateTimeFormat($locale, {
            dateStyle: 'medium'
          }).format(refreshedAt.toDate())}
        {/if}
      </div>
    </div>
  </div>
  <div>
    {#if isRegisteredInFirebase && pushRegistration != null && pushRegistration.status === PushRegistrationStatus.ACTIVE}
      <div class="trash">
        <IconButton
          icon={trashIcon}
          alt={$_('account.notifications.delete')}
          width="3rem"
          on:click={() => pushRegistration && deletePushRegistration(pushRegistration)}
        />
      </div>
    {:else if canSuggestToTurnOnNotifsForCurrentDevice && isMobileDevice && currentSub === null}
      <!-- TODO: potential notification suppport action -->
      <Button
        xsmall
        on:click={() => handleNotificationEnableAttempt()}
        loading={$isEnablingLocalPushRegistration}
      >
        {$_('account.notifications.turn-on')}
      </Button>
    {/if}
  </div>
</div>

<style>
  .entry {
    width: 100%;
    display: flex;
    gap: 2rem;
    justify-content: space-between;
    align-items: center;
  }

  .header {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .header :global(i) {
    width: 4rem;
    height: 4rem;
  }
  .header :global(svg) {
    fill: var(--color-green);
  }

  .header > .copy {
    font-size: 1.7rem;
  }

  .header .extra-info {
    font-size: 1.5rem;
    color: var(--color-darker-gray);
  }

  .trash {
    display: flex;
    align-content: center;
  }
  .trash :global(button i svg) {
    fill: var(--color-orange);
    stroke: var(--color-danger);
    color: var(--color-danger);
  }
</style>

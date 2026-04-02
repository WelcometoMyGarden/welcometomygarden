<script lang="ts">
  import {
    deletePushRegistration,
    isNotificationEligible,
    handleNotificationEnableAttempt
  } from '$lib/api/push-registrations';
  import { getNativeUAInfo } from '$lib/api/push-registrations/native';
  import { Button, Icon } from '$lib/components/UI';
  import IconButton from '$lib/components/UI/IconButton.svelte';
  import { androidIcon, appleIcon, mobileDeviceIcon, trashIcon } from '$lib/images/icons';
  import { coercedLocale } from '$lib/stores/app';
  import {
    currentWebPushSubStore,
    deviceId,
    isEnablingLocalPushRegistration
  } from '$lib/stores/pushRegistrations';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { PushRegistrationStatus, type LocalPushRegistration } from '$lib/types/PushRegistration';
  import { trackEvent } from '$lib/util';
  import { getDeviceWebUAWithClientHints } from '$lib/api/push-registrations/webpush';
  import { isIDeviceOS, isMobileDevice, isNative, uaInfo } from '$lib/util/uaInfo';
  import { capitalize } from 'lodash-es';
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { isNativePushRegistration, isWebPushRegistration } from '$lib/util/push-registrations';
  interface Props {
    pushRegistration?: LocalPushRegistration | undefined;
  }

  let { pushRegistration = undefined }: Props = $props();

  // When pushRegistration is falsy, it used to display the potential current PR.
  // That one will be native if we are on a native device.
  let isNativePR = $derived(
    pushRegistration == null ? isNative : isNativePushRegistration(pushRegistration)
  );

  // if the pushRegistration prop is undefined, fill destructured properties with null (except ua)
  let {
    id,
    refreshedAt,
    ua: { os, browser, device }
  } = $derived(
    pushRegistration || {
      id: null,
      createdAt: null,
      refreshedAt: null,
      ua: {
        os: uaInfo!.os.name,
        browser: uaInfo!.browser.name,
        device: uaInfo!.device
      },
      subscription: { endpoint: null }
    }
  );

  let pRWebPushEndpoint = $derived(
    pushRegistration &&
      (isWebPushRegistration(pushRegistration) ? pushRegistration.subscription.endpoint : undefined)
  );

  onMount(async () => {
    // If we're showing the local device
    if (!pushRegistration) {
      // ... override the device with client hints
      if (isNative) {
        device = (await getNativeUAInfo()).device;
      } else {
        device = await getDeviceWebUAWithClientHints();
      }
    }
  });

  let pureBrowserName = $derived(browser?.replace('Mobile ', ''));

  /**
   * Whether this registration exists in Firebase
   */
  let isRegisteredInFirebase = $derived(!!id);
  let canSuggestToTurnOnNotifsForCurrentDevice =
    // ... we're on a mobile device
    $derived(
      // TODO Revise this?
      // native or
      isNative ||
        // ... we're on a mobile device browser
        (isMobileDevice! &&
          // ... that currently doesn't have a sub
          $currentWebPushSubStore === null &&
          // ... and could have notifications
          isNotificationEligible() &&
          // ... and hasn't been registered yet in Firebase
          !isRegisteredInFirebase)
    );

  // Note: both these expressions can not refer to the current device,
  // since they need to work for any given other device UA too.
  let isIDevice = $derived(isIDeviceOS(os ?? ''));
  let isAndroid = $derived(capitalize(os ?? '') === 'Android');
</script>

<div class="entry">
  <div class="header">
    <Icon icon={isIDevice ? appleIcon : isAndroid ? androidIcon : mobileDeviceIcon} />
    <div class="copy">
      <!-- Don't show "Safari on" on iDevices or native devices,
       since people might be confused if they added with Chrome/FF on iOS + people are not interested in webview browsers -->
      {#if !isNativePR && !isIDevice}
        {pureBrowserName}
        {$_('generics.on')}
      {/if}
      <div class="device-name">
        {device?.vendor !== 'Apple' ? `${device.vendor} ` : ''}{device.model ??
          os ??
          $_('account.notifications.unknown')}
      </div>
      <div class="extra-info">
        {#if !isRegisteredInFirebase || (pushRegistration && (isNativePushRegistration(pushRegistration) ? pushRegistration.deviceId === $deviceId : $currentWebPushSubStore?.endpoint === pRWebPushEndpoint))}
          {$_('account.notifications.current')}
        {:else if refreshedAt}
          {$_('account.notifications.last-seen')}
          {new Intl.DateTimeFormat($coercedLocale, {
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
          onclick={() => {
            if (pushRegistration) {
              deletePushRegistration(pushRegistration);
              trackEvent(PlausibleEvent.REMOVE_NOTIFICATIONS);
            }
          }}
        />
      </div>
    {:else if isNative || (canSuggestToTurnOnNotifsForCurrentDevice && isMobileDevice && $currentWebPushSubStore === null)}
      <!-- TODO: potential notification suppport action -->
      <Button
        xsmall
        onclick={() => {
          handleNotificationEnableAttempt();
          trackEvent(PlausibleEvent.ENABLE_NOTIFICATIONS_ACCOUNT);
        }}
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
    flex-basis: 68%;
    /* Cede space to the flex-neighbor (the button), beyond the flex-basis*/
    min-width: 0;
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
    /* Allow the icon on the left to grow in the flex container */
    min-width: 0;
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

  .device-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

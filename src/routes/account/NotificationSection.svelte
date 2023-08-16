<script lang="ts">
  import { locale } from 'svelte-i18n';
  import {
    createPushRegistrationObserver,
    getCurrentSubscription,
    createPushRegistration,
    type PushSubscriptionPOJO,
    deletePushRegistration,
    hasNotificationSupport
  } from '$lib/api/push-registrations';
  import { Anchor, Button } from '$lib/components/UI';
  import { user } from '$lib/stores/auth';
  import { pushRegistrations } from '$lib/stores/pushRegistrations';
  import type { Unsubscribe } from 'firebase/firestore';
  import { onDestroy, onMount } from 'svelte';
  import { UAParser } from 'ua-parser-js';
  import { browser } from '$app/environment';

  let unsubscribeFromObserver: null | Unsubscribe = null;
  let ua = new UAParser(
    browser && 'navigator' in window ? navigator.userAgent : undefined
  ).getResult();

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
    currentSub = (await getCurrentSubscription()) ?? null;
  });

  onDestroy(() => {
    if (unsubscribeFromObserver) unsubscribeFromObserver();
    unsubscribeFromObserver = null;
  });

  // TODO: wasn't the iPad Pro masquerading as a Mac?
  const isIDevice = /iOS|iPadOS/.test(ua.os.name ?? '');
  const versionString = ua.os.version ?? ua.browser.version ?? null;
  const iDeviceVersion = versionString ? Number.parseFloat(versionString) : null;
  // note: os.name is not reliable
  const currentAppleDevice = ua.device.model ?? 'iPhone or iPad';
  const currentAppleOS =
    currentAppleDevice === 'iPhone'
      ? 'iOS'
      : currentAppleDevice === 'iPad'
      ? 'iPadOS'
      : 'iOS or iPadOS';
  /**
   * Version 16 iDevices < 16.4 can surely be upgraded to 16.4, which support notifications, see below.
   */
  const isUpgradeable16IDevice =
    isIDevice && iDeviceVersion && iDeviceVersion >= 16.0 && iDeviceVersion < 16.4;
  /**
   * Whether this is likely an iDevice that supports notifications on Home Screen apps.
   * https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
   */
  const is_16_4_OrAboveIDevice = isIDevice && iDeviceVersion && iDeviceVersion >= 16.4;

  // your script goes here
</script>

<div>
  <h2>Notifications</h2>
  <table>
    <th />
    {#each $pushRegistrations as { id, createdAt, ua: { os, browser, device }, subscription: { endpoint } }, i}
      <tr>
        <td
          >{browser} on {os ?? device.model ?? 'unknown'}
          {currentSub?.endpoint === endpoint ? '(current)' : ''}</td
        >
        <td
          >Enabled on {new Intl.DateTimeFormat($locale, { dateStyle: 'medium' }).format(
            createdAt.toDate()
          )}</td
        >
        <td
          ><button on:click={() => deletePushRegistration($pushRegistrations[i])}
            >Remove notifications</button
          ></td
        >
      </tr>
    {/each}
  </table>
  {#if !hasNotificationSupport()}
    {#if is_16_4_OrAboveIDevice}
      <p>You have an {currentAppleDevice} that supports WTMG notifications!</p>
      <p>
        To enable them, you must first add the WTMG website as an app to your Home Screen, and open
        these account settings from within that app.
      </p>
      <Button
        href={'https://support.apple.com/en-gb/guide/shortcuts/apd735880972/ios'}
        target="_blank">Learn how here</Button
      >
    {:else if isIDevice}
      {#if isUpgradeable16IDevice}
        <p>
          Notifications are not supported on your current browser, but it looks like you are using
          an
          {currentAppleDevice} with {currentAppleOS}
          {iDeviceVersion} that can certainly be upgraded to {currentAppleOS} version 16.4 or higher,
          which supports our notifications!
        </p>
      {:else}
        <p>
          Notifications are not supported on your current browser on {currentAppleOS}
          {iDeviceVersion}
        </p>
        <p>
          If you can find your Apple device in <Anchor
            href="https://support.apple.com/en-us/HT213411"
            newtab>this list</Anchor
          >, you should be able to upgrade your OS to version 16.4 or higher, which supports our
          notifications! Otherwise, you'll have to keep using email for now.
        </p>
      {/if}
      <p>
        <Anchor newtab href="https://support.apple.com/en-us/HT204204"
          >Learn how to upgrade your mobile operating system</Anchor
        >, then check back here.
      </p>
    {:else}
      <p>It looks like your {ua.os.name} device doesn't support WTMG notifications.</p>
      <p>
        Some older browsers, or older devices, <Anchor
          href="https://developer.mozilla.org/en-US/docs/Web/API/Push_API#browser_compatibility"
          >don't support the web technology</Anchor
        > that we use (Web Push).
      </p>
      {#if ua.os.name === 'Android'}
        <p>
          On Android, you can try downloading a browser like Firefox or Chrome from the Play Store
          and see if notifications can be enabled from there.
        </p>
      {/if}
    {/if}
  {:else if currentSub === null}
    <!-- It seems like there is Web Push support! -->
    <p>Get push notifications on this browser or device</p>
    <Button uppercase xsmall on:click={() => createPushRegistration()}>Enable notifications</Button>
  {:else if currentSub != null && !$pushRegistrations.find((pR) => pR.subscription.endpoint === currentSub?.endpoint)}
    <!-- If we locally have a subscription that isn't available remotely, then add it.
    This normally shouldn't happen, except when a database was wiped (in testing) -->
    <p>Your current browser already allows WTMG notifications, but WTMG will not send them.</p>
    <Button uppercase xsmall on:click={() => createPushRegistration()}>Restore notifications</Button
    >
  {/if}
</div>

<style>
  h2 {
    margin-bottom: 2rem;
    font-weight: 500;
    font-size: 1.8rem;
  }
</style>

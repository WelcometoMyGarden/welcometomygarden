<script lang="ts">
  import Modal from '$lib/components/UI/Modal.svelte';
  import { _ } from 'svelte-i18n';
  import { close } from '$lib/stores/app';
  import { Button, Text } from '$lib/components/UI';
  import { AndroidSettings, IOSSettings, NativeSettings } from 'capacitor-native-settings';
  import { App } from '@capacitor/app';
  import { handleNotificationEnableAttempt } from '$lib/api/push-registrations';
  import logger from '$lib/util/logger';

  let returnedToApp = $state(false);

  async function registerReturnToApp() {
    // Note: this should be called while the app is active (true)
    // It works because the initial existing state upon calling does not trigger an event.
    // Only a false/true cycle triggers a "return to app".
    const stateChangeListener = await App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        logger.debug('Returned to app');
        returnedToApp = true;
        if (stateChangeListener) {
          stateChangeListener.remove();
        }
      }
    });
  }
  $effect(() => {
    if (returnedToApp) {
      // Close the modal and show the loading state in the /account page,
      // otherwise handleNotificationAttempt will not close it
      returnedToApp = false;
      close();
      // Delay the retry to allow rootModal to clear the black background after close
      // otherwise it gets stacked
      setTimeout(() => {
        // Retry, but show the modal again if it fails
        handleNotificationEnableAttempt(true);
      }, 500);
    }
  });
</script>

<Modal className="native-notification-denied-modal" center closeButton onclose={close}>
  {#snippet title()}
    <Text is="h1" weight="w600" size="l" class="title">Turning on notifications</Text>
  {/snippet}
  {#snippet body()}
    <p>
      It looks like the notification permission for the WTMG app is turned off in your phone’s
      settings. Go to your settings to turn it back on, then return to the app.
    </p>
    <div class="btns">
      <Button
        onclick={() => {
          registerReturnToApp();
          NativeSettings.open({
            optionAndroid: AndroidSettings.AppNotification,
            // Note: AppNotification is not officially supported (see plugin docs)
            // and on an iOS 18.6 simulator, it just opened the settings app overview screen,
            // not the WTMG app settings.
            // When using the supported .App on a simulator, that opens the apps listing view
            // (which is also still one step away from where we want it to be)
            // Let's check what this does in TestFlight.
            optionIOS: IOSSettings.AppNotification
          });
        }}
        fullWidth
        small={true}
        uppercase>Open notification settings</Button
      >
      <!-- Show retry button after the app is foregrounded again -->
      <Button inverse fullWidth small={true} uppercase onclick={close}
        >{$_('push-notifications.how-to.ios-upgrade.btn-skip')}</Button
      >
    </div>
  {/snippet}
</Modal>

<style>
  .btns > :global(*:first-child) {
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  /* TODO Design System: WHY does this have to be specified here. */
  :global(.native-notification-denied-modal .title) {
    font-family: var(--fonts-copy);
  }
  p {
    margin-bottom: 1.5rem;
  }
</style>

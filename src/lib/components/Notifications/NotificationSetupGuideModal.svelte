<script lang="ts">
  import Modal from '$lib/components/UI/Modal.svelte';

  import { hasWebPushNotificationSupportNow, isAndroidFirefox } from '$lib/util/push-registrations';
  import { _ } from 'svelte-i18n';
  import { close } from '$lib/stores/app';
  import { iDeviceInfo, isMobileDevice } from '$lib/util/uaInfo';
  import IosBrowserSteps from './IOSBrowserSteps.svelte';
  import { Button, Text } from '$lib/components/UI';
  import { anchorText, lr } from '$lib/util/translation-helpers';
  import routes from '$lib/routes';

  let { is_16_4_OrAboveIDevice, isUpgradeable16IDevice } = iDeviceInfo!;
</script>

<Modal className="notification-setup-guide-modal" center closeButton onclose={close}>
  {#snippet title()}
    <Text is="h1" weight="w600" size="l" class="title">{$_('push-notifications.how-to.title')}</Text
    >
  {/snippet}
  {#snippet body()}
    <div>
      <!-- Follow-up paragraph: depends on context -->
      {#if !isMobileDevice}
        <!-- If the device is not clearly a mobile or tablet device,
      show instructions on how to proceed -->
        <!-- https://github.com/faisalman/ua-parser-js/issues/182#issuecomment-263115448 -->
        {@html $_('push-notifications.prompt.follow-up-desktop')}
      {:else if isAndroidFirefox()}
        {@html $_('account.notifications.unsupported-android')}
      {:else if is_16_4_OrAboveIDevice && !hasWebPushNotificationSupportNow()}
        <!-- State that mobile notifications are definitely possible -->
        <IosBrowserSteps />
      {:else if isUpgradeable16IDevice}
        <div class="upgrade">
          <!-- iOS: can be upgraded to a compatible version -->
          <p>
            {@html $_('push-notifications.how-to.ios-upgrade.copy', {
              values: {
                os: iDeviceInfo?.currentAppleOS,
                link: anchorText({
                  href: $_('push-notifications.how-to.ios-upgrade.help-link'),
                  linkText: $_('push-notifications.how-to.ios-upgrade.help-link-copy'),
                  class: 'link'
                }),
                accountSettings: anchorText({
                  href: $lr(routes.ACCOUNT),
                  linkText: $_('push-notifications.how-to.ios-upgrade.account-settings'),
                  newtab: false,
                  class: 'link'
                })
              }
            })}
          </p>
          <div class="upgrade-btns">
            <Button
              href={$_('push-notifications.how-to.ios-upgrade.help-link')}
              fullWidth
              small={true}
              uppercase
              target="_blank">{$_('push-notifications.how-to.ios-upgrade.btn-show')}</Button
            >
            <Button inverse fullWidth small={true} uppercase onclick={close}
              >{$_('push-notifications.how-to.ios-upgrade.btn-skip')}</Button
            >
          </div>
        </div>
      {:else if hasWebPushNotificationSupportNow()}
        <!-- TODO: should we show an error message here? or just ignore this? -->
        <!-- .. or immediately enable notifications & close the modal? -->
        <!-- This case shouldn't occur, we shouln't get directed here in this case-->
      {/if}
    </div>
  {/snippet}
</Modal>

<style>
  .upgrade-btns > :global(*:first-child) {
    margin-top: 1rem;
    margin-bottom: 1rem;
  }

  /* TODO Design System: WHY does this have to be specified here. */
  :global(.notification-setup-guide-modal .title) {
    font-family: var(--fonts-copy);
    margin-bottom: 1rem;
  }
  :global(.notification-setup-guide-modal .upgrade p) {
    margin-bottom: 1rem;
  }
</style>

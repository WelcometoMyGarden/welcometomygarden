<script lang="ts">
  import { handleNotificationEnableAttempt } from '$lib/api/push-registrations';
  import { Button } from '$lib/components/UI';
  import Modal from '$lib/components/UI/Modal.svelte';
  import { close } from '$lib/stores/app';

  import { _ } from 'svelte-i18n';

  const action = async () => {
    const success = await handleNotificationEnableAttempt();
    if (success) {
      close();
    }
  };
</script>

<!--
  @component
  A start-up pop-up for the "Add to Home Screen" iOS PWA apps that support
  notifications. It should only be shown when notifications are supported!
-->

<!--
  Forwards ou modal's close action to svelte-simple-modal
  TODO: leverage svelte-simple-modal more directly, & make our wrapper thinner?
  then we'd also get the fade-out effect
-->
<Modal center on:close={() => close()}>
  <div slot="body">
    <p>{@html $_('banners.notifications.ios-installed')}</p>
    <div class="buttons">
      <Button xsmall on:click={action}>
        {$_('banners.notifications.btn-yes')}
      </Button>
    </div>
  </div>
</Modal>

<style>
  .buttons {
    display: flex;
    margin: 0.75rem 0;
    gap: 1rem;
  }
</style>

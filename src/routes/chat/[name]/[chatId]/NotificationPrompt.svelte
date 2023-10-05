<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Button from '$lib/components/UI/Button.svelte';
  import { Icon, Text } from '$lib/components/UI';
  import { crossIcon } from '$lib/images/icons';
  import { slide } from 'svelte/transition';
  import { setExpiringCookie } from '$lib/util/set-cookie';
  import { NOTIFICATION_PROMPT_DISMISSED_COOKIE } from '$lib/constants';
  import { isMobileDevice } from '$lib/util/uaInfo';

  import { getCookie } from '$lib/util';
  import {
    canHaveNotificationSupport,
    handleNotificationEnableAttempt
  } from '$lib/api/push-registrations';
  import { bellIcon } from '$lib/images/icons';

  /**
   * Keep showing this notice, regardless of cookie state. Never close it.
   */
  export let permanent: boolean = false;
  export let show: boolean = permanent ? true : false;
  const close = () => {
    show = false;

    // Manage how long the prompt should stay hidden now.
    // Note: the modal will only be shown when
    // - the cookie value is NOT true
    // - or the duration since the timestamp in the cookie is over some initial threshold (first pass)
    const cookie = getCookie(NOTIFICATION_PROMPT_DISMISSED_COOKIE);
    const HALF_YEAR_HRS = 24 * 30 * 6;
    if (!cookie) {
      // When the cookie was set
      setExpiringCookie(
        NOTIFICATION_PROMPT_DISMISSED_COOKIE,
        new Date().toUTCString(),
        // 1 year expiration (expiry is needed to avoid a session coookie)
        HALF_YEAR_HRS * 2,
        {
          path: '/'
        }
      );
    } else {
      // First pass done
      // We now overwrite the cookie with the ~6 month reminder cookie
      setExpiringCookie(NOTIFICATION_PROMPT_DISMISSED_COOKIE, true, HALF_YEAR_HRS, {
        path: '/'
      });
    }
  };

  const affirmativeAction = async () => {
    const success = await handleNotificationEnableAttempt();
    if (success && !permanent) {
      // TODO close when sending to help center?
      // TODO: close when sending to howto screen?
      // see impl
      close();
    }
  };
</script>

{#if show}
  <div class="prompt" in:slide={{ delay: 500, duration: 500 }} out:slide={{ duration: 500 }}>
    <div class="icon"><Icon icon={bellIcon} greenStroke /></div>
    <Text is="span" size="l">{$_('push-notifications.prompt.title')}</Text>
    {#if !permanent}
      <button class="close" type="button" on:click={close} aria-label="Close">
        <Icon icon={crossIcon} />
      </button>
    {/if}
    <Button xsmall on:click={affirmativeAction} fullWidth centered>
      {#if !isMobileDevice}
        <!-- "Show me how" copy-->
        {$_('push-notifications.prompt.btn-show-me')}
      {:else if canHaveNotificationSupport()}
        <!-- "Turn on" copy -->
        {$_('push-notifications.prompt.btn-turn-on')}
      {/if}
      <!-- TODO If notifs are not even potentially supported, this component should not be shown! -->
    </Button>
  </div>
{/if}

<style>
  .icon :global(i) {
    width: 2em;
  }
  .prompt {
    width: 100%;
    position: relative;
    display: grid;
    gap: 1rem;
    flex-direction: column;
    background-color: var(--color-beige-light);
    padding: 1.5rem;
    border-radius: var(--modal-border-radius);
    margin: var(--spacing-small) 0;
  }

  /* .tip {
    line-height: 1.5;
    font-size: 1.4rem;
  } */

  .close {
    position: absolute;
    background: none;
    border: none;
    width: 4rem;
    right: 0.6rem;
    top: 1.1rem;
  }

  .close:hover {
    cursor: pointer;
  }

  @media screen and (min-width: 1000px) {
    .prompt :global(.button) {
      align-self: center;
      grid-column-start: 2;
      grid-row-start: 1;
      grid-row-end: 4;
    }
  }
</style>

<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Button from '$lib/components/UI/Button.svelte';
  import { Icon } from '$lib/components/UI';
  import { crossIcon } from '$lib/images/icons';
  import { slide } from 'svelte/transition';
  import { setExpiringCookie } from '$lib/util/set-cookie';
  import { NOTIFICATION_PROMPT_DISMISSED_COOKIE } from '$lib/constants';
  import { isMobileDevice, isNative } from '$lib/util/uaInfo';

  import { getCookie, trackEvent } from '$lib/util';
  import { handleNotificationEnableAttempt } from '$lib/api/push-registrations/index';
  import { bellIcon } from '$lib/images/icons';
  import NewBadge from '$lib/components/Nav/NewBadge.svelte';
  import { isEnablingLocalPushRegistration } from '$lib/stores/pushRegistrations';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import AppStoreBadge from './AppStoreBadge.svelte';

  interface Props {
    /**
     * Keep showing this notice, regardless of cookie state. Never close it.
     */
    permanent?: boolean;
    show?: boolean;
  }

  let { permanent = false, show = $bindable(permanent ? true : false) }: Props = $props();
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
      close();
    }

    // Only implies that the button was pressed on a mobile device
    // "permanent" is only used on the desktop /account page
    trackEvent(
      permanent
        ? PlausibleEvent.ENABLE_NOTIFICATIONS_ACCOUNT
        : PlausibleEvent.ENABLE_NOTIFICATIONS_CHAT
    );
  };
</script>

{#if show}
  <div class="notification-prompt container">
    <div
      class="prompt"
      in:slide={{ delay: 500, duration: 500 }}
      out:slide={{ duration: 500 }}
      class:has-badges={!isMobileDevice}
      class:permanent
    >
      <div class="topline">
        <div class="icon"><Icon icon={bellIcon} greenStroke /></div>
        {#if !permanent}
          <!-- Because it is only permanent in NotificationSection.svelte, where another "new" label exists on a h2 title -->
          <NewBadge>{$_('generics.new')}</NewBadge>
        {/if}
      </div>
      <span class="description">
        {#if !isMobileDevice}
          <!-- Desktop copy -->
          {$_('push-notifications.prompt.desktop-title')}
        {:else if isNative}
          {$_('push-notifications.prompt.native-title')}
        {:else}
          <!-- We're on mobile web -->
          {$_('push-notifications.prompt.mobile-web-title')}
        {/if}
      </span>
      {#if !permanent}
        <button class="close" type="button" onclick={close} aria-label="Close">
          <Icon icon={crossIcon} />
        </button>
      {/if}
      {#if !isMobileDevice}
        <!-- We're on a desktop browser -->
        <div class="store-badges">
          <AppStoreBadge platform="apple" />
          <AppStoreBadge platform="google" />
        </div>
      {:else}
        <!-- We're either on mobile web or native, show a single button -->
        <Button
          xsmall
          onclick={affirmativeAction}
          fullWidth
          centered
          loading={$isEnablingLocalPushRegistration}
        >
          {#if isNative}
            <!-- "Turn on" copy -->
            {$_('push-notifications.prompt.btn-turn-on')}
          {:else}
            <!-- We're on non-native mobile web -->
            {$_('push-notifications.prompt.download')}
          {/if}
        </Button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .container {
    width: 100%;
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
    grid-template-areas:
      'header'
      'description'
      'button';
  }

  @supports (container-type: inline-size) {
    .container {
      container-type: inline-size;
      container-name: prompt-container;
    }
  }

  .topline {
    grid-area: header;
    display: flex;
    align-items: center;
    gap: 1rem;
    align-self: center;
  }

  .prompt .description {
    grid-area: description;
    max-width: 480px;
    font-size: var(--paragraph-font-size);
    line-height: 1.6;
  }

  /* Dodge the cross */
  /* Give more space to the single button */
  .prompt.has-badges .description {
    margin-right: 2rem;
  }

  .prompt :global(.button) {
    grid-area: button;
  }
  .icon :global(i) {
    width: 2em;
  }

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

  .store-badges {
    grid-area: button;
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
  }
  .store-badges :global(svg) {
    /* This exact value (45 instead of 44) to prevent fractional scaling issues with the Google SVG borders */
    height: 45px;
    width: auto;
    justify-content: start;
    align-items: center;
  }

  @supports (container-type: inline-size) {
    /* used to be screen and min width 1000 */
    @container (min-width: 560px) {
      .prompt.prompt:not(.permanent) .description {
        margin-right: 0;
        align-self: center;
      }

      /* Non-badge (mobile web) */
      .prompt:not(.has-badges) {
        grid-template-areas:
          'header header'
          'description button';
        column-gap: 2rem;
      }

      /* Allow badges to stack vertically */
      .prompt.has-badges {
        grid-template-areas:
          'header button'
          'description button';
      }
      .prompt .store-badges {
        justify-self: center;
        flex-direction: column;
        justify-content: center;
        width: 138px;
        /* padding: 2px 0; */
        gap: 1.3rem;
        margin: 0 0.5rem 0 1rem;
        height: unset;
      }

      /* Vertical stacking requires permanent + same 100% width */
      .prompt .store-badges :global(.store-badge-link) {
        width: 100%;
      }
      .prompt .store-badges :global(svg) {
        width: 100%;
        height: auto;
        justify-content: center;
      }

      /* If we want to vertically stack next to the cross */
      .prompt:not(.permanent) .store-badges {
        margin-right: 4.9rem;
        align-self: end;
      }
    }

    @container (min-width: 630px) {
      /* non-permanent slide chat in */
      .prompt:not(.permanent) {
        grid-template-areas:
          'header header'
          'description button';
      }

      .prompt:not(.permanent) .store-badges {
        width: unset;
        align-self: center;
        flex-direction: row;
        flex-wrap: nowrap;
        margin-right: 0;
      }

      .prompt .store-badges :global(.store-badge-link) {
        width: auto;
      }
      .prompt .store-badges :global(svg) {
        height: 45px;
        /* justify-content: center; */
      }

      .prompt:not(.permanent) :global(.svg) {
        height: 43px;
        width: auto;
      }
    }
  }
</style>

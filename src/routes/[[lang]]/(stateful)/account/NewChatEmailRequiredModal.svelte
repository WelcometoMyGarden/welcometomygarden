<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Modal } from '$lib/components/UI';
  import AppStoreBadge from '$routes/[[lang]]/(stateful)/chat/[name]/[chatId]/AppStoreBadge.svelte';

  interface Props {
    show?: boolean;
  }

  let { show = $bindable(false) }: Props = $props();
</script>

<!-- @component
Explains why new chat message emails can't be turned off without mobile push notifications,
and points to the app.

The rule itself lives in two places: this frontend gate (Firestore rules can't check it —
it depends on the `push-registrations` subcollection), and `onPushRegistrationWrite.js`,
which flips the preference back on once the last active mobile registration is gone.
 -->

<Modal
  bind:show
  maxWidth="600px"
  ariaLabelledBy="new-chat-email-required-title"
  center
  onclose={() => (show = false)}
>
  {#snippet title()}
    <h2 id="new-chat-email-required-title">{$_('account.preferences.chat-required.title')}</h2>
  {/snippet}
  {#snippet body()}
    <p>{@html $_('account.preferences.chat-required.description')}</p>
    <p class="install">{$_('account.preferences.chat-required.install')}</p>
    <div class="store-badges">
      <AppStoreBadge platform="apple" />
      <AppStoreBadge platform="google" />
    </div>
  {/snippet}
</Modal>

<style>
  h2 {
    font-size: 1.8rem;
    font-weight: 500;
  }

  p {
    line-height: 1.6;
  }

  .install {
    margin-top: 1.5rem;
  }

  .store-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .store-badges :global(svg) {
    /* This exact value (45 instead of 44) to prevent fractional scaling issues with the Google SVG borders */
    height: 45px;
    width: auto;
  }
</style>

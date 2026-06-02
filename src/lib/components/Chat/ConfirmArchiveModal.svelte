<script lang="ts">
  import { archiveChat, markChatSeen } from '$lib/api/chat';
  import routes from '$lib/routes';
  import { close } from '$lib/stores/app';
  import type { LocalChat } from '$lib/types/Chat';
  import { goto } from '$lib/util/navigate';
  import { lr } from '$lib/util/translation-helpers';
  import { isConversationSeen } from '$routes/[[lang]]/(stateful)/chat/archive-actions.svelte';
  import { _ } from 'svelte-i18n';
  import { Modal } from '../UI';
  import Button from '../UI/Button.svelte';

  let { chat: chatToConfirm }: { chat: LocalChat } = $props();

  /**
   * Confirm-archive a chat that had unseen messages. Marks the chat as seen if needed,
   * then calls the optional afterConfirm callback (e.g. to navigate away).
   */
  const performConfirmedArchive = async () => {
    const chat = chatToConfirm;
    if (!chat) return;
    if (!isConversationSeen(chat)) {
      await markChatSeen(chat.id);
    }
    await goto($lr(routes.CHAT));
    await archiveChat(chat.id, chat.partner.firstName);
    close();
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
    if (e.key === 'Enter') {
      e.stopPropagation();
      performConfirmedArchive();
    }
  };
</script>

<svelte:window onkeydown={onKeydown} />

<Modal center={true} maxWidth="560px">
  {#snippet title()}
    <div class="title-section">
      <h2>{$_('chat.confirm-archive.title')}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <p class="body">
      <!-- TODO insecure -->
      {@html $_('chat.confirm-archive.body', {
        values: { name: `<strong>${chatToConfirm?.partner.firstName}</strong>` }
      })}
    </p>
  {/snippet}
  {#snippet controls()}
    <div class="actions">
      <Button medium type="button" uppercase inverse onclick={close}>{$_('generics.cancel')}</Button
      >
      <Button medium onclick={performConfirmedArchive}>{$_('chat.confirm-archive.confirm')}</Button>
    </div>
  {/snippet}
  <!-- <div class="actions">
  </div> -->
</Modal>

<style>
  .body {
    font-size: 1.5rem;
    color: var(--color-green);
    line-height: 1.6;
    margin-bottom: 2.4rem;
  }

  .body :global(strong) {
    font-weight: 700;
  }

  .actions {
    display: flex;
    gap: 1.2rem;
    justify-content: flex-end;
  }

  @media (max-width: 700px) {
    .actions {
      flex-direction: column-reverse;
    }

    .btn-cancel,
    .btn-confirm {
      width: 100%;
      text-align: center;
    }
  }
</style>

<script>
  export let chatId;

  import { params, goto } from '@sveltech/routify';
  import { getPublicUserProfile } from '@/api/user';
  import { observeMessagesForChat, create as createChat } from '@/api/chat';
  import { user } from '@/stores/auth';
  import { chats } from '@/stores/chat';
  import routes from '@/routes';

  let typedMessage = '';

  const isNew = chatId === 'new';

  let chat = null;
  $: chat = Object.keys($chats).find(id => {
    const c = $chats[id];
    return c && c.users.includes($user.id);
  });

  $: if (chat && !chat.messages) observeMessagesForChat(chat.id);

  let isSending = false;
  const sendMessage = async () => {
    // TODO: make sure typedMessage is below or equal to 500 characters
    isSending = true;
    if (!chat) {
      try {
        const newChatId = await createChat($user.id, $params.id, typedMessage);
        typedMessage = '';
        $goto(`${routes.CHAT}/${$params.name}/${newChatId}`);
      } catch (ex) {
        // TODO: show error
        console.log(ex);
      }
    } else {
      try {
        await sendMessage(chat.id, typedMessage);
        typedMessage = '';
      } catch (ex) {
        // TODO: show error
        console.log(ex);
      }
    }
    isSending = false;
  };
</script>

<div class="messages">
  {#if chat && chat.messages && chat.messages.length === 0}
    <p class="empty-state">You and {chat.partner.firstName} have no messages.</p>
  {:else}
    <span />
  {/if}
</div>
<form on:submit|preventDefault={sendMessage}>
  <textarea
    placeholder="Type your message..."
    type="text"
    name="message"
    bind:value={typedMessage}
    disabled={isSending} />
  <button type="submit" disabled={isSending} aria-label="Send message">Send message &#62;</button>
</form>

<style>
  .messages {
    flex: 0.92;
    width: 100%;
    position: relative;
    padding: 1rem 0;
  }

  .empty-state {
    bottom: 1rem;
    left: 0;
    position: absolute;
  }

  form {
    flex: 0.08;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: 100%;
  }

  textarea {
    background-color: rgba(187, 187, 187, 0.23);
    padding: 1rem;
    border: 1px solid transparent;
    border-radius: 0.6rem;
    flex: 0.92;
    resize: vertical;
  }

  textarea:focus {
    border: 1px solid var(--color-green);
  }

  form button {
    background-color: var(--color-green);
    font-size: 1.8rem;
    color: var(--color-white);
    border: 0;
    padding: 1rem;
    border-radius: 0.5rem;
    outline: 0;
  }
</style>

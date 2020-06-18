<script>
  export let chatId;

  import { beforeUpdate, afterUpdate } from 'svelte';
  import { fade } from 'svelte/transition';
  import { params, goto } from '@sveltech/routify';
  import { observeMessagesForChat, create as createChat, sendMessage } from '@/api/chat';
  import { user } from '@/stores/auth';
  import { chats, messages } from '@/stores/chat';
  import { Avatar } from '@/components/UI';
  import routes from '@/routes';

  $: chat = $chats[chatId];

  $: if (chat && !$messages[chat.id]) observeMessagesForChat(chat.id);

  let messageContainer;
  let autoscroll;

  // Scroll to bottom of mesage container on new message
  beforeUpdate(() => {
    autoscroll =
      messageContainer &&
      messageContainer.offsetHeight + messageContainer.scrollTop >
        messageContainer.scrollHeight - 20;
  });

  afterUpdate(() => {
    if (autoscroll && messageContainer) messageContainer.scrollTo(0, messageContainer.scrollHeight);
  });

  let hint = '';
  $: if (typedMessage && typedMessage.length > 500) {
    const len = typedMessage.length;
    hint = `Your message is ${len - 500} ${len - 500 === 1 ? 'character' : 'characters'} too long`;
  } else {
    hint = '';
  }

  const normalizeWhiteSpace = message => message.replace(/\n\s*\n\s*\n/g, '\n\n');

  let typedMessage = '';
  let isSending = false;
  const send = async () => {
    // TODO: make sure typedMessage is below or equal to 500 characters
    isSending = true;
    if (!chat) {
      try {
        const newChatId = await createChat($user.id, $params.id, normalizeWhiteSpace(typedMessage));
        typedMessage = '';
        $goto(`${routes.CHAT}/${$params.name}/${newChatId}`);
      } catch (ex) {
        // TODO: show error
        console.log(ex);
      }
    } else {
      try {
        await sendMessage(chat.id, normalizeWhiteSpace(typedMessage));
        typedMessage = '';
      } catch (ex) {
        // TODO: show error
        console.log(ex);
      }
    }
    isSending = false;
  };
</script>

<div class="message-wrapper" bind:this={messageContainer}>
  <div class="messages">
    {#if chat && $messages[chat.id]}
      {#each $messages[chatId] as message (message.id)}
        <div class="message" class:by-user={message.from === $user.id}>
          <div class="avatar">
            <Avatar name={message.from === $user.id ? $user.firstName : chat.partner.firstName} />
          </div>
          <p class="message-text">{normalizeWhiteSpace(message.content)}</p>
        </div>
      {/each}
    {/if}
  </div>
</div>
<form on:submit|preventDefault={send}>
  {#if hint}
    <p class="hint" transition:fade>{hint}</p>
  {/if}
  <textarea
    placeholder="Type your message..."
    type="text"
    name="message"
    bind:value={typedMessage}
    disabled={isSending} />
  <button type="submit" disabled={isSending || !!hint} aria-label="Send message">
    Send message &#62;
  </button>
</form>

<style>
  .message-wrapper {
    flex: 0.9;
    width: 100%;
    position: relative;
    overflow-y: auto;
    margin-bottom: 4rem;
  }

  .messages {
    padding: 0 2rem 0 0;
    display: flex;
    flex-direction: column-reverse;
    min-height: 100%;
  }

  .avatar {
    align-self: flex-end;
  }

  .message {
    display: flex;
    align-items: center;
    margin-top: 1rem;
    max-width: 70%;
  }

  .message.by-user {
    align-self: flex-end;
    flex-flow: row-reverse;
  }

  .message-text {
    margin-left: 2rem;
    white-space: pre-wrap;
    padding: 1.2rem;
    background-color: var(--color-gray);
    border-radius: 1rem;
  }

  .message.by-user .message-text {
    margin-left: 0;
    margin-right: 2rem;
    background-color: var(--color-green-light);
  }

  form {
    flex: 0.08;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: 100%;
    position: relative;
  }

  .hint {
    color: var(--color-danger);
    height: 3rem;
    font-size: 1.4rem;
    position: absolute;
    top: -2.5rem;
    left: 0;
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

  @media (min-width: 700px) and (max-width: 850px) {
    .message {
      max-width: 80%;
    }
  }
</style>

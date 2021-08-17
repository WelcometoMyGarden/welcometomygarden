<script>
  export let chatId;
  import { _ } from 'svelte-i18n';
  import { beforeUpdate, afterUpdate, onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { params, goto } from '@roxi/routify';
  import { observeMessagesForChat, create as createChat, sendMessage } from '@/api/chat';
  import { hasGarden } from '@/api/garden';
  import { user } from '@/stores/auth';
  import { chats, messages } from '@/stores/chat';
  import { Avatar, Icon } from '@/components/UI';
  import { User } from '@/components/Chat';
  import { tentIcon } from '@/images/icons';
  import routes from '@/routes';

  let partnerHasGarden = null;
  let partnerId;
  let chat;

  // Allow chat to change on chatId change
  $: if (chatId) {
    partnerHasGarden = chat = null;
  }

  // Only change chat if falsy (this will avoid reregistering the observeMessagesForChat, thus avoid dups)
  $: if (!chat) chat = $chats[chatId];

  $: if (partnerHasGarden === null && chat && $user.id) {
    partnerId = chat.users.find((id) => $user.id !== id);
    hasGarden(partnerId)
      .then((res) => {
        partnerHasGarden = res;
      })
      .catch((err) => {
        // something went wrong just act like partner has no garden
        console.log(err);
        partnerHasGarden = false;
      });
  }

  $: if (chat && !$messages[chat.id]) {
    observeMessagesForChat(chat.id);
  }

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

  onMount(() => {
    messageContainer.scrollTo(0, messageContainer.scrollHeight);
  });

  let hint = '';
  $: if (typedMessage && typedMessage.length > 500) {
    const len = typedMessage.length;
    hint = $_('chat.notify.too-long', { values: { surplus: len - 500 } });
  } else {
    hint = '';
  }

  const normalizeWhiteSpace = (message) => message.replace(/\n\s*\n\s*\n/g, '\n\n');

  let typedMessage = '';
  let isSending = false;
  const send = async () => {
    if (!typedMessage) {
      hint = $_('chat.notify.empty-message');
      return;
    }
    isSending = true;
    hint = '';
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

  $: partnerName = chat && chat.partner ? chat.partner.firstName : '';
</script>

<svelte:head>
  <title>
    {$_('chat.title-conversation', { values: { partnerName: partnerName } })} | Welcome To My Garden
  </title>
</svelte:head>

<header class="chat-header chat-header--sm">
  <div class="chat-header--sm__top">
    <a class="back" href={routes.CHAT}>&#x3c;</a>
    <h2 class="title">{partnerName}</h2>
  </div>
  {#if partnerHasGarden}
    <div class="chat-header--sm__bot">
      <a href={`${routes.MAP}/garden/${partnerId}`} class="garden-link link" in:fade>
        <Icon icon={tentIcon} />
        <span>{$_('chat.go-to-garden')}</span>
      </a>
    </div>
  {/if}
</header>

<header class="chat-header chat-header--md">
  {#if partnerName}
    <User name={partnerName}>
      {#if partnerHasGarden}
        <div class="chat-header--md__bot" in:fade>
          <a href={`${routes.MAP}/garden/${partnerId}`} class="garden-link link">
            <Icon icon={tentIcon} />
            <span>{$_('chat.go-to-garden')}</span>
          </a>
        </div>
      {/if}
    </User>
  {/if}
</header>

<div class="message-wrapper" bind:this={messageContainer}>
  <div class="messages">
    {#if chat && $messages[chat.id]}
      {#each $messages[chat.id] as message (message.id)}
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
    placeholder={$_('chat.type-message')}
    type="text"
    name="message"
    bind:value={typedMessage}
    disabled={isSending}
  />
  <button type="submit" disabled={isSending || !typedMessage || hint} aria-label="Send message">
    &#62;
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
    word-break: break-word;
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
    width: 100%;
    height: 6rem;
    margin-right: 2rem;
    resize: vertical;
    transition: border 300ms ease-in-out;
  }

  textarea:focus {
    border: 1px solid var(--color-green);
  }

  form button {
    background-color: var(--color-green);
    font-size: 2.4rem;
    color: var(--color-white);
    border: 0;
    padding: 1rem;
    border-radius: 0.5rem;
    outline: 0;
    width: 6rem;
    height: 6rem;
    cursor: pointer;
    transition: all 300ms var(--color-gray);
  }

  form button:disabled {
    background-color: var(--color-gray);
    color: var(--color-green);
    cursor: not-allowed;
  }

  .chat-header--sm {
    display: none;
  }

  .chat-header {
    background: var(--color-white);
    width: 100%;
  }

  .chat-header--md {
    padding: 1.5rem 1rem;
    box-shadow: 0px 5px 3px -3px rgba(143, 142, 142, 0.1);
  }

  .chat-header--md__bot {
    margin-top: 0.8rem;
    height: 2rem;
  }

  .garden-link {
    display: inline-flex;
    align-items: center;
    color: var(--color-green);
  }

  .garden-link :global(i) {
    width: 2.5rem;
    margin-right: 5px;
    display: inline-block;
  }

  @media (min-width: 700px) and (max-width: 850px) {
    .message {
      max-width: 80%;
    }
  }

  @media (max-width: 700px) {
    .message-wrapper {
      margin-bottom: 2rem;
      padding-top: 6rem;
    }

    .message-wrapper :global(.avatar) {
      width: 4rem;
      height: 4rem;
    }

    .message-text {
      margin-left: 1rem;
      padding: 1rem;
    }

    .message.by-user .message-text {
      margin-right: 1rem;
    }

    .chat-header--md {
      display: none;
    }

    .chat-header--sm {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 10;
      box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
      display: block;
    }

    .chat-header--sm .title {
      width: 100%;
      text-align: center;
      font-size: 1.8rem;
      font-weight: 900;
    }

    .chat-header--sm__top {
      height: 6rem;
      display: flex;
      align-items: center;
      position: relative;
    }

    .chat-header--sm__bot {
      height: 2rem;
      position: relative;
      display: flex;
      justify-content: center;
    }

    .chat-header--sm__bot .garden-link {
      position: absolute;
      top: -1.5rem;
    }

    .back {
      height: 4rem;
      width: 4rem;
      left: 2rem;
      position: absolute;
      font-size: 2.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
    }
  }
</style>

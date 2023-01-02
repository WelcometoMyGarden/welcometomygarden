<script>
  import { _ } from 'svelte-i18n';
  import { beforeUpdate, afterUpdate, onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import { observeMessagesForChat, create as createChat, sendMessage } from '$lib/api/chat';
  import { hasGarden } from '$lib/api/garden';
  import { user } from '@/lib/stores/auth';
  import { chats, messages } from '$lib/stores/chat';
  import { Avatar, Icon } from '$lib/components/UI';
  import { User } from '$lib/components/Chat';
  import { tentIcon } from '$lib/images/icons';
  import routes from '$lib/routes';
  import { formatDate } from '$lib/util';
  import chevronRight from '$lib/images/icons/chevron-right.svg';

  let chatId = $page.params.chatId;
  // Subscribe to page is necessary to get the chat page of the selected chat (when the url changes) for desktop
  page.subscribe((currentPage) => (chatId = currentPage.params.chatId));

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
        const newChatId = await createChat(
          $user.id,
          $page.url.searchParams.get('id'),
          normalizeWhiteSpace(typedMessage)
        );
        typedMessage = '';
        goto(`${routes.CHAT}/${$page.params.name}/${newChatId}`);
      } catch (ex) {
        // TODO: show error
        console.log(ex);
      }
    } else {
      try {
        await sendMessage($user.id, chat.id, normalizeWhiteSpace(typedMessage));
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
    {$_('chat.title-conversation', { values: { partnerName: partnerName } })} | {$_(
      'generics.wtmg.explicit'
    )}
  </title>
</svelte:head>

<!-- TODO: probably no need to have two different sets of markup here,
CSS grids should do the job cleanly -->

<header class="chat-header chat-header--sm">
  <a class="back" href={routes.CHAT}><Icon greenStroke icon={chevronRight} /></a>
  <h2 class="title">{partnerName}</h2>
  {#if partnerHasGarden}
    <a href={`${routes.MAP}/garden/${partnerId}`} class="garden-link link" in:fade>
      <Icon icon={tentIcon} />
      <span>{$_('chat.go-to-garden')}</span>
    </a>
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
          <div class="holder">
            <div class="avatar-box">
              <Avatar name={message.from === $user.id ? $user.firstName : chat.partner.firstName} />
            </div>
            <p class="message-text">{normalizeWhiteSpace(message.content)}</p>
          </div>
          <div class="timestamp">
            {formatDate(message.createdAt.seconds * 1000)}
          </div>
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
  <!-- TODO: pressed state -->
  <button
    class="send"
    type="submit"
    disabled={isSending || !typedMessage || hint}
    aria-label="Send message"
  >
    <!-- TODO: add a better send icon (paper plane?) -->
    <Icon icon={chevronRight} greenStroke />
  </button>
</form>

<style>
  :root {
    --spacing-chat-header: 8rem;
  }
  .message-wrapper {
    flex: 0.9;
    width: 100%;
    position: relative;
    overflow-y: auto;
    margin-bottom: 4rem;
  }

  .messages {
    padding: 0 2rem 0 1rem;
    display: flex;
    flex-direction: column-reverse;
    height: calc(
      100% - var(--spacing-chat-header) - var(--height-mobile-nav) - env(safe-area-inset-bottom)
    );
    min-height: 100%;
  }

  .avatar-box {
    align-self: flex-end;
  }

  .message {
    display: flex;
    flex-direction: column;
    margin-top: 1rem;
    max-width: 70%;
    word-break: break-word;

    align-items: flex-start;
  }

  .message.by-user {
    align-self: flex-end;
  }

  .holder {
    display: flex;
    flex-direction: row;
  }

  .message.by-user .holder {
    flex-direction: row-reverse;
    align-self: flex-end;
  }

  .message-text {
    white-space: pre-wrap;
    padding: 1.2rem;

    border-radius: 1rem 1rem 1rem 0rem;
    margin-left: 2rem;
    margin-right: 0rem;
    background-color: var(--color-gray);
  }

  .message.by-user .message-text {
    border-radius: 1rem 1rem 0rem 1rem;
    margin-left: 0;
    margin-right: 2rem;
    background-color: var(--color-green-light);
  }

  .timestamp {
    color: var(--color-darker-gray);
    font-size: 1.2rem;
    padding-top: 0.2rem;

    margin-left: calc(5rem + 2rem);
    margin-right: 0;
    align-self: flex-start;
  }

  .message.by-user .timestamp {
    margin-left: 0;
    margin-right: calc(5rem + 2rem);
    align-self: flex-end;
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

  .send {
    width: 6rem;
    padding: 1.7rem;
  }

  @media (min-width: 700px) and (max-width: 850px) {
    .message {
      max-width: 80%;
    }
  }

  @media (max-width: 700px) {
    .message-wrapper {
      margin-bottom: 2rem;
    }

    .message-wrapper :global(.avatar) {
      width: 4rem;
      height: 4rem;
    }

    .message-text {
      padding: 1rem;

      margin-left: 1rem;
      padding: 1rem;
    }

    .message.by-user .message-text {
      margin-right: 1rem;
    }

    .timestamp {
      margin-left: 5rem;
    }

    .message.by-user .timestamp {
      margin-right: 5rem;
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
      height: var(--spacing-chat-header);
      display: flex;
      flex-direction: column;
      width: 100%;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
    }

    .chat-header--sm .title {
      width: 100%;
      text-align: center;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .back {
      height: 3rem;
      width: 3rem;
      left: 2.5rem;
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .back :global(i) {
      transform: rotate(180deg);
    }
  }
</style>

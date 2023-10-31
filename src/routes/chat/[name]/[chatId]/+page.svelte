<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { beforeUpdate, afterUpdate, onMount, onDestroy, tick } from 'svelte';
  import { fade } from 'svelte/transition';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import { observeMessagesForChat, createChat, sendMessage, markChatSeen } from '$lib/api/chat';
  import { hasGarden } from '$lib/api/garden';
  import { user } from '$lib/stores/auth';
  import { chats, messages, newConversation } from '$lib/stores/chat';
  import { Avatar, Icon } from '$lib/components/UI';
  import { User } from '$lib/components/Chat';
  import { tentIcon } from '$lib/images/icons';
  import routes from '$lib/routes';
  import { formatDate, getCookie } from '$lib/util';
  import chevronRight from '$lib/images/icons/chevron-right.svg';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import type { LocalChat } from '$lib/types/Chat';
  import MembershipModal from '$routes/(marketing)/(membership)/MembershipModal.svelte';
  import ChatErrorModal from '$lib/components/UI/ChatErrorModal.svelte';
  import NotificationPrompt from './NotificationPrompt.svelte';
  import { NOTIFICATION_PROMPT_DISMISSED_COOKIE } from '$lib/constants';
  import {
    hasOrHadEnabledNotificationsSomewhere,
    hasNotificationSupportNow,
    canHaveNotificationSupport
  } from '$lib/api/push-registrations';
  import { isMobileDevice } from '$lib/util/uaInfo';

  /**
   * The chat ID of the currently selected chat.
   * Equal to 'new' in case of a new chat. The UID of the recipient is then in the query param 'id'.
   */
  let chatId = $page.params.chatId;
  // Subscribe to page is necessary to get the chat page of the selected chat (when the url changes) for desktop
  const unsubscribeFromPage = page.subscribe((currentPage) => (chatId = currentPage.params.chatId));

  let partnerHasGarden: boolean | null = null;
  let partnerId: string | undefined;
  /**
   * The currently selected chat, if it exists.
   * Undefined if chatId === 'new'
   */
  let chat: LocalChat | null | undefined;
  $: chat = $chats[chatId];

  $: showMembershipModal = !$user?.superfan && chatId === 'new';
  let showNotificationPrompt = false;

  let showErrorModal = false;
  let error: unknown = null;
  let errorDetails: string | undefined = undefined;
  const showChatError = (exception: unknown, details?: string) => {
    console.error(exception);
    error = exception;
    try {
      // Catch errors, in case any of the data accessors fail
      errorDetails =
        details ??
        JSON.stringify(
          {
            sender: $user?.uid,
            chatId,
            idParam: $page.url.searchParams.get('id'),
            partnerId,
            ua: typeof navigator !== 'undefined' && navigator.userAgent
          },
          null,
          2
        );
    } catch (e) {
      // do nothing
      console.error(e);
    }
    showErrorModal = true;
  };

  const backNavHandler = () => {
    // Document contains the target. We're interested in detecting navigation back to the garden side drawer.
    if (document.location.pathname.includes('/explore/garden')) {
      trackEvent(PlausibleEvent.MEMBERSHIP_MODAL_BACK);
    }

    // Remove the handler
    window.removeEventListener('popstate', backNavHandler);
  };

  $: if (showMembershipModal == true) {
    trackEvent(PlausibleEvent.OPEN_MEMBERSHIP_MODAL, {
      source: 'direct'
    });

    window.addEventListener('popstate', backNavHandler);
  }

  // Initialize variables related to the chat partner,
  // when the first chat is opened or when the selected chat has changed.
  let partnerInitializedForChatId: string | null = null;
  $: if (
    // If a chat has been fully instantiated, or we're looking at a new chat
    (chat || $newConversation) &&
    (partnerHasGarden === null || partnerInitializedForChatId !== chatId)
  ) {
    console.log('id', partnerId);
    console.log('id', $newConversation);
    // variables are initialized
    // 1. Partner ID
    partnerId = chat ? chat.users.find((id) => $user?.id !== id) : $newConversation!.partnerId;
    if (!partnerId) {
      throw new Error('Unexpected error: no chat partner found. All chats must have two members.');
    }
    // 2. Has garden?
    hasGarden(partnerId)
      .then((response) => {
        partnerHasGarden = response;
      })
      .catch((err) => {
        // something went wrong just act like partner has no garden
        console.log(err);
        partnerHasGarden = false;
      })
      .finally(() => {
        // 3. Initialized state
        partnerInitializedForChatId = chat ? chat.id : 'new';
      });
  }

  let unsubscribeFromMessageListener: (() => void) | null = null;
  let messageListenerRegisteredForChatId: string | null = null;

  /**
   * Does _not_ take care of unregistering existing listeners
   */
  const registerMessageListenerForChat = (chat: LocalChat) => {
    unsubscribeFromMessageListener = observeMessagesForChat(chat.id);
    messageListenerRegisteredForChatId = chat.id;
  };

  // Register the message listener if it has not been registered yet,
  // or change it if the chat has changed.
  $: if ($user && chat) {
    if (!unsubscribeFromMessageListener && !messageListenerRegisteredForChatId) {
      // Registering first message observer
      registerMessageListenerForChat(chat);
    }
    if (unsubscribeFromMessageListener && messageListenerRegisteredForChatId !== chatId) {
      // The user changed the selected chat: change the message listener registration
      unsubscribeFromMessageListener();
      registerMessageListenerForChat(chat);
    }
  }

  // Mark the last message as seen if this is the first time the user opens it
  $: if (
    chat &&
    $messages[chat.id] instanceof Array &&
    // The last message is from the partner
    chat.lastMessageSender === partnerId &&
    // The message was not seen yet
    chat.lastMessageSeen === false
  ) {
    markChatSeen(chatId);
  }

  const cleanupPage = () => {
    if (unsubscribeFromMessageListener) unsubscribeFromMessageListener();
    unsubscribeFromMessageListener = null;
    messageListenerRegisteredForChatId = null;
    chat = null;
    partnerId = undefined;
    partnerHasGarden = null;
  };

  // On logout, clean up
  $: if (!$user && unsubscribeFromMessageListener) {
    cleanupPage();
  }

  let messageContainer: HTMLDivElement | undefined;
  let autoscroll: boolean | undefined;

  // Scroll to bottom of mesage container on new message
  // only scroll down if we are already looking at the botom
  beforeUpdate(() => {
    autoscroll =
      // Check if we're looking at the bottom of the list of chats (recentmost chat).
      // If so, mark the view as eligible to auto-scroll to the next incoming chat.
      messageContainer &&
      messageContainer.scrollTop >=
        messageContainer.scrollHeight - messageContainer.clientHeight - 25;
  });

  onMount(() => {
    // Start off at the bottom
    // TODO: will this apply when changing chats?
    scrollDownMessages();
  });

  // When receiving a new chat
  // TODO: hijacking scroll on an incoming chat might be intrusive?
  afterUpdate(() => {
    if (autoscroll) scrollDownMessages();
  });

  let hint = '';
  $: if (typedMessage && typedMessage.length > 500) {
    const len = typedMessage.length;
    hint = $_('chat.notify.too-long', { values: { surplus: len - 500 } });
  } else {
    hint = '';
  }

  const normalizeWhiteSpace = (message: string) => message.replace(/\n\s*\n\s*\n/g, '\n\n');

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
          $page.url.searchParams.get('id') || '',
          normalizeWhiteSpace(typedMessage)
        );
        trackEvent(PlausibleEvent.SEND_REQUEST);
        typedMessage = '';
        goto(`${routes.CHAT}/${$page.params.name}/${newChatId}`);
      } catch (ex) {
        showChatError(ex);
      }
    } else {
      try {
        await sendMessage(chat.id, normalizeWhiteSpace(typedMessage));
        // The first uid in the users array is the requester/traveller
        const role = chat.users[0] === $user?.id ? 'traveller' : 'host';
        trackEvent(PlausibleEvent.SEND_RESPONSE, { role });
        // Reset the text area
        typedMessage = '';
        if (textArea) {
          textArea.style.height = '0';
        }
        // Scroll down in the chats list
        scrollDownMessages();
      } catch (ex) {
        showChatError(ex);
      }
    }

    const COOKIE_FIRST_REMINDER_DAYS = 30;
    // TODO: test if this appears after a new message to a new person
    // Show instructions notifications after sending message as a traveller
    // TODO take into account existing notifs
    const cookie = getCookie(NOTIFICATION_PROMPT_DISMISSED_COOKIE);
    if (
      // Only show if we haven't enabled notifications anywhere yet
      !hasOrHadEnabledNotificationsSomewhere() &&
      // Only show if we are on desktop, or we are on a mobile with potential support
      (hasNotificationSupportNow() || canHaveNotificationSupport() || !isMobileDevice) &&
      // Only show if the user hasn't just seen it
      (!cookie ||
        // The cookie == "true" means it was dismissed for 6 monthts
        (cookie != 'true' &&
          // Otherwise, it must hold a creation timestamp
          new Date().getTime() - new Date(cookie).getTime() >
            COOKIE_FIRST_REMINDER_DAYS * 24 * 60 * 60 * 1000))
    ) {
      showNotificationPrompt = true;
    }

    isSending = false;
  };

  onDestroy(() => {
    cleanupPage();
    unsubscribeFromPage();
    // Has no effect if the handler was registered
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
    window.removeEventListener('popstate', backNavHandler);
  });

  $: partnerName =
    chat && chat.partner ? chat.partner.firstName : $newConversation ? $newConversation.name : '';

  $: sendButtonDisabled = isSending || !typedMessage || !!hint;

  let textArea: HTMLTextAreaElement | undefined;

  const scrollDownMessages = () => {
    if (messageContainer) {
      console.log('scrolling down');
      messageContainer.scrollTo(0, messageContainer.scrollHeight - messageContainer.offsetHeight);
    } else {
      console.log('no container');
    }
  };
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

<div class="message-wrapper">
  <div class="messages" bind:this={messageContainer}>
    {#if chat && $messages[chat.id]}
      <div class="pusher" />
      {#each $messages[chat.id] as message (message.id)}
        <div class="message" class:by-user={message.from === $user?.id}>
          <div class="holder">
            <div class="avatar-box">
              <Avatar
                name={message.from === $user?.id ? $user.firstName : chat.partner.firstName}
              />
            </div>
            <p class="message-text">{normalizeWhiteSpace(message.content)}</p>
          </div>
          <div class="timestamp">
            {formatDate(message.createdAt.seconds * 1000)}
          </div>
        </div>
      {/each}
    {/if}
    <NotificationPrompt bind:show={showNotificationPrompt} />
  </div>
</div>
<form on:submit|preventDefault={send}>
  {#if hint}
    <p class="hint" transition:fade>{hint}</p>
  {/if}
  <textarea
    placeholder={$_('chat.type-message')}
    name="message"
    bind:value={typedMessage}
    bind:this={textArea}
    disabled={isSending}
    on:input={({ target }) => {
      // @ts-ignore
      if (target?.style) {
        // Reset the height, which helps with scaling down when removing content
        // https://stackoverflow.com/a/25621277/4973029
        // @ts-ignore
        target.style.height = 0;
        // The 3px helps avoid showing a scrollbar when the content shouldn't be scrollable
        // @ts-ignore
        target.style.height = textArea?.scrollHeight + 3 + 'px';
      }
    }}
  />
  <!-- TODO: pressed state -->
  <button class="send" type="submit" disabled={sendButtonDisabled} aria-label="Send message">
    <!-- TODO: add a better send icon (paper plane?) -->
    <Icon icon={chevronRight} greenStroke={sendButtonDisabled} whiteStroke={!sendButtonDisabled} />
  </button>
</form>
<MembershipModal bind:show={showMembershipModal} />
<ChatErrorModal bind:show={showErrorModal} details={errorDetails} {error} />

<style>
  :root {
    --spacing-chat-header: 8rem;
  }

  .message-wrapper {
    flex-grow: 1;
    width: 100%;
    position: relative;
    overflow-y: hidden;
  }

  .messages {
    padding: 0 1rem 0 0;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100%;
    overflow-y: scroll;
    overflow-x: hidden;
  }

  .avatar-box {
    align-self: flex-end;
  }

  /*
    Pushes messages down in case their total height is less than the screen size.
    Replacement for the pure css flex-direction: row-reverse; which lead to weird
    negative scrolltop + reversed HTML etc.
   */
  .pusher {
    flex-grow: 1;
  }

  .message {
    display: flex;
    flex-direction: column;
    margin-top: 1rem;
    /* The 500px is to constrain the max-width on desktop */
    max-width: min(80%, 500px);
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
    /* `pre-wrap` renders the text more-or-less as the user has typed it,
        also rendering duplicate whitespace characters.
       `pre-line` would collapse white space between words like 'word1    word2',
       but still respect actual line breaks. */
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
    padding-top: 1.2rem;
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
    /* the 16px font size actually prevents iOS/Safari from zooming in on this box */
    font-size: 16px;
    background-color: rgba(187, 187, 187, 0.23);
    padding: 1rem;
    border: 1px solid transparent;
    border-radius: 0.6rem;
    width: 100%;
    min-height: 6rem;
    /* 26 rem for desktop, 38svh is intended for mobile */
    max-height: min(26rem, 38svh);
    margin-right: 1.2rem;
    /* Disable manual resizing, since we adapt to the text automatically */
    resize: none;
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

  @media (min-width: 701px) and (max-width: 850px) {
    .message {
      max-width: 80%;
    }
  }

  @media (max-width: 700px) {
    .message-wrapper {
      margin-bottom: 0;
    }

    .message-wrapper :global(.avatar) {
      width: 3rem;
      height: 3rem;
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
      margin-left: 4rem;
    }

    .message.by-user .timestamp {
      margin-right: 4rem;
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

    /* Setting the padding here rather than on the parent ensures
     that the scroll bar doesn't appear weirdly padded from the right */
    .chat-header--sm,
    .message-wrapper > .messages,
    form {
      padding-left: 1.2rem;
      padding-right: 1.2rem;
    }
  }
</style>

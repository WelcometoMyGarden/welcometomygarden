<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { page } from '$app/state';
  import { markChatSeen } from '$lib/api/chat';
  import { user } from '$lib/stores/auth';
  import { messages, newConversation } from '$lib/stores/chat';
  import { Avatar, Icon } from '$lib/components/UI';
  import { User } from '$lib/components/Chat';
  import { markerIconPhosphor, tentIcon } from '$lib/images/icons';
  import routes from '$lib/routes';
  import { formatDate } from '$lib/util';
  import chevronRight from '$lib/images/icons/chevron-right.svg?inline';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import ChatErrorModal from '$lib/components/UI/ChatErrorModal.svelte';
  import NotificationPrompt from './NotificationPrompt.svelte';
  import MembershipModal from '$lib/components/Membership/MembershipModal.svelte';
  import ChatGuidelines from './ChatGuidelines.svelte';
  import { countryNames } from '$lib/stores/countryNames';
  import { lr } from '$lib/util/translation-helpers';
  import { cleanupMessageListeners, updateMessageListeners } from './_chat-loading.svelte';
  import {
    state as sharedState,
    role,
    chat as sharedChat,
    scrollDownMessages,
    loadPartner,
    partner,
    backNavHandler
  } from './_shared.svelte';
  import MessageBox, {
    MAX_MESSAGE_LENGTH,
    state as messageState,
    normalizeWhiteSpace,
    send
  } from './MessageBox.svelte';
  import { isMobile } from '$lib/stores/ui.svelte';
  import Fragment from '$lib/components/UI/Fragment.svelte';
  import { afterNavigate } from '$app/navigation';

  /**
   * See $sharedChat for docs
   */
  let chat = $derived($sharedChat);

  let HeaderComponent = $derived(isMobile() ? Fragment : User);

  /**
   * The currently requested chat id
   * NOTE: this may be different from chat.id
   * In case of a new conversation, chat.id will be undefined, and chatIdPath will be `new`
   */
  let chatIdPath = $derived(page.params.chatId);

  // UI state
  let showNotificationPrompt = $state(false);
  let showMembershipModal = $derived(!$user?.superfan && chatIdPath === 'new');
  let sendButtonDisabled = $derived.by(() => {
    const { isSending, typedMessage, hint } = messageState;
    return isSending || !typedMessage || !!hint;
  });
  let autoscroll: boolean | undefined = $state(false);

  // Scroll to bottom of message container when a new message arrives
  // only scroll down if we are already looking at the bottom
  $effect.pre(() => {
    if (chat && Array.isArray($messages[chat.id])) {
      const msgCont = sharedState.messageContainer;
      autoscroll =
        // Check if we're looking at the bottom of the list of chat messages (recentmost chat).
        // If so, mark the view as eligible to auto-scroll to the next incoming chat.
        msgCont && msgCont.scrollTop >= msgCont.scrollHeight - msgCont.clientHeight - 25;
    }
  });

  $effect(() => {
    // Track the opening of the membership modal, and browser back buttons
    if (showMembershipModal == true) {
      trackEvent(PlausibleEvent.OPEN_MEMBERSHIP_MODAL, {
        source: 'direct'
      });

      window.addEventListener('popstate', backNavHandler);
    }

    // Load messages for the current chat
    // Register the message listener for the currently selected chat if it has not been registered yet,
    // or change it if the chat has changed. This loads the chat messages for the current chat.
    if ($user && chat) {
      updateMessageListeners($user, chat);
    }

    // Asynchronously look up whether the partner has a garden, whenever the open chat changes
    if (chat || $newConversation) {
      loadPartner();
    }

    // If autoscroll is enabled, trigger it after a DOM render
    if (autoscroll) {
      scrollDownMessages();
    }

    // Mark the last message as seen if this is the first time the user opens it
    if (
      chat &&
      chatIdPath &&
      Array.isArray($messages[chat.id]) &&
      // The last message is from the partner
      typeof chat.lastMessageSender !== 'undefined' &&
      chat.lastMessageSender === $partner?.id &&
      // The message was not seen yet
      chat.lastMessageSeen === false
    ) {
      markChatSeen(chatIdPath);
    }

    const typedMessage = messageState.typedMessage;
    if (typedMessage && typedMessage.length > MAX_MESSAGE_LENGTH) {
      const len = typedMessage.length;
      // This key uses ICU syntax https://formatjs.io/docs/core-concepts/icu-syntax/#plural-format
      // Referenced from https://github.com/kaisermann/svelte-i18n/blob/main/docs/Formatting.md
      messageState.hint = $_('chat.notify.too-long', {
        values: { surplus: len - MAX_MESSAGE_LENGTH }
      });
    } else {
      messageState.hint = '';
    }
  });

  // Note: whenever we switch chats, this ensures we scroll to the latest message
  // Otherwise, opening another (long) will keep it at the first message.
  // TODO: remembering your scroll position might make more sense?
  afterNavigate(() => {
    // Start off at the bottom
    scrollDownMessages();
  });

  onDestroy(() => {
    // Has no effect if the handler was not registered
    // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
    window.removeEventListener('popstate', backNavHandler);
    cleanupMessageListeners();
  });
</script>

<svelte:head>
  {#if $partner?.name}
    <title>
      {$_('chat.title-conversation', { values: { partnerName: $partner.name } })} | {$_(
        'generics.wtmg.explicit'
      )}
    </title>
  {/if}
</svelte:head>

<header class:mobile={isMobile()}>
  <!-- This component switches based on mobile or not -->
  <HeaderComponent name={$partner?.name ?? ''}>
    {#if isMobile()}
      <!-- Back to overview nav -->
      <a class="back" href={$lr(routes.CHAT)}><Icon greenStroke icon={chevronRight} /></a>
    {/if}
    <div class="header-content">
      {#if isMobile()}
        <h2 class="title">{$partner?.name}</h2>
      {/if}
      {#if $role === 'host' && chat}
        <div class="country-name">
          <Icon icon={markerIconPhosphor} />
          {$countryNames[chat.partner.countryCode]}
        </div>
      {/if}
      {#if sharedState.partnerHasGarden[$partner?.id ?? '']}
        <a href={`${$lr(routes.MAP)}/garden/${$partner?.id}`} class="garden-link" in:fade>
          <Icon icon={tentIcon} />
          <span>{$_('chat.go-to-garden')}</span>
        </a>
      {/if}
    </div>
  </HeaderComponent>
</header>

<div class="message-wrapper">
  <div class="messages" bind:this={sharedState.messageContainer}>
    {#if chat && $messages[chat.id]}
      <div class="pusher"></div>
      {#each $messages[chat.id] as message (message.id)}
        <div class="message" class:by-user={message.from === $user?.id}>
          <div class="holder">
            <div class="avatar-box">
              <Avatar
                name={message.from === $user?.id ? $user.firstName : chat.partner.firstName}
              />
            </div>
            <p class="message-text notranslate">{normalizeWhiteSpace(message.content)}</p>
          </div>
          <div class="timestamp">
            {formatDate(message.createdAt.seconds * 1000)}
          </div>
        </div>
      {/each}
    {:else if !chat && $newConversation && $partner?.name}
      <!-- Show the guidelines, but only if is a new chat -->
      <ChatGuidelines hostName={$partner?.name} />
    {/if}
    <NotificationPrompt bind:show={showNotificationPrompt} />
  </div>
</div>
<form
  onsubmit={(e) => {
    e.preventDefault();
    send();
  }}
>
  {#if messageState.hint}
    <p class="hint" transition:fade>{messageState.hint}</p>
  {/if}
  <MessageBox />
  <!-- TODO: pressed state -->
  <button class="send" type="submit" disabled={sendButtonDisabled} aria-label="Send message">
    <!-- TODO: add a better send icon (paper plane?) -->
    <Icon icon={chevronRight} greenStroke={sendButtonDisabled} whiteStroke={!sendButtonDisabled} />
  </button>
</form>
<MembershipModal
  bind:show={showMembershipModal}
  onclose={() => {
    sharedState.membershipModalClosedByOutsideClick = true;
    window.history.back();
  }}
/>
<ChatErrorModal
  bind:show={messageState.showErrorModal}
  details={messageState.errorDetails}
  error={messageState.error}
/>

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
    /* Shows the scroll bar only when needed */
    overflow-y: auto;
    overflow-x: hidden;
  }

  .avatar-box {
    align-self: flex-end;
  }

  /*
    Pushes messages down in case their total height is less than the screen size,
    for example when there is only one message.
    This method is a replacement for the pure css `flex-direction: row-reverse` method on .messages;
    which lead to reversed HTML elements and an unintuitive negative scrollTop.
   */
  .pusher {
    /* Why this value? Empirically, the value 1 seems to push the content 1px out of
     its container, resulting in a pointless scroll bar being shown. */
    flex-grow: 0.97;
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
    display: grid;
    grid-template:
      'hint hint'
      'textarea sendbtn' / 1fr auto;
    column-gap: 1.2rem;
    align-items: flex-end;
    width: 100%;
    position: relative;
    padding-top: 1.2rem;
  }

  .hint {
    grid-area: hint;
    color: var(--color-danger);
    height: 3rem;
    font-size: 1.4rem;
    top: -2.5rem;
    left: 0;
  }

  form button {
    grid-area: sendbtn;
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

  header {
    background: var(--color-white);
    width: 100%;
  }

  header.mobile {
    color: var(--color-green-3);
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

  header.mobile .title {
    width: 100%;
    text-align: center;
    font-size: 1.8rem;
    font-weight: 600;
  }

  .header-content {
    display: flex;
    color: var(--color-green-3);
  }

  header.mobile .header-content {
    margin-top: 0.5rem;
    flex-direction: column;
    gap: 0.5rem;
  }

  header:not(.mobile) {
    padding: 1.5rem 1rem;
    box-shadow: 0px 5px 3px -3px rgba(143, 142, 142, 0.1);
  }

  header:not(.mobile) .header-content {
    margin-top: 0.8rem;
    height: 2rem;
    gap: 2px;
  }

  .country-name {
    margin-right: 6px;
  }

  .garden-link,
  .country-name {
    display: inline-flex;
    align-items: center;
    color: var(--color-green-3);
  }

  .garden-link:not(:hover) {
    text-decoration: underline;
  }

  .country-name :global(i),
  .garden-link :global(i) {
    width: 1.8rem;
    transform: translateY(1px);
    display: inline-block;
  }
  .garden-link :global(i svg),
  .country-name :global(i svg) {
    fill: var(--color-green-3);
  }
  .garden-link :global(i) {
    margin-right: 6px;
  }
  .country-name :global(i) {
    margin-right: 3px;
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
    header.mobile,
    .message-wrapper > .messages,
    form {
      padding-left: 1.2rem;
      padding-right: 1.2rem;
    }
  }
</style>

<script module lang="ts">
  import { onDestroy, tick, untrack } from 'svelte';
  import { page } from '$app/state';
  import { createChat, sendMessage } from '$lib/api/chat';
  import routes from '$lib/routes';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { getCookie, trackEvent } from '$lib/util';
  import { goto } from '$lib/util/navigate';
  import { lr } from '$lib/util/translation-helpers';
  import { _ } from 'svelte-i18n';
  import { get } from 'svelte/store';
  import * as Sentry from '@sentry/sveltekit';
  import { user } from '$lib/stores/auth';
  import { hasOrHadEnabledNativeNotificationsSomewhere } from '$lib/api/push-registrations';
  import { isMobileWebDevice, isNative, uaInfo } from '$lib/util/uaInfo';
  import { chat as sharedChat, role, scrollDownMessages, partner } from './_shared.svelte';
  import { NOTIFICATION_PROMPT_DISMISSED_COOKIE } from '$lib/constants';
  import { OS } from 'ua-parser-js/enums';
  import logger from '$lib/util/logger';
  import { deviceId, pushRegistrations } from '$lib/stores/pushRegistrations';
  import { isNativePushRegistration } from '$lib/util/push-registrations';
  import { PushRegistrationStatus } from '$lib/types/PushRegistration';
  import {
    clearDraft,
    clearDraftIfBlank,
    draftKey,
    flushDrafts,
    getDraft,
    holdDraftListing,
    releaseDraftListing,
    setDraft
  } from '$lib/stores/chatDrafts.svelte';

  export const MAX_MESSAGE_LENGTH = 800;

  const initialState = {
    typedMessage: '',
    isSending: false,
    sendWasSuccessful: false,
    hint: '',
    showErrorModal: false,
    error: null,
    errorDetails: undefined,
    showNotificationPrompt: false,
    textArea: undefined
  };

  export let state = $state<
    Omit<typeof initialState, 'error' | 'errorDetails' | 'textArea'> & {
      error: unknown;
      errorDetails: undefined | string;
      textArea: undefined | HTMLTextAreaElement;
    }
  >(initialState);

  // Note: readonly reactivity - when assigning these, they will not be reactive in other modules
  let { typedMessage, sendWasSuccessful } = $derived(state);

  export const normalizeWhiteSpace = (message: string) => message.replace(/\n\s*\n\s*\n/g, '\n\n');

  /**
   * Grows/shrinks the message box to fit its contents. Also needed after a
   * programmatic value change (restoring a draft), which doesn't fire `input`.
   */
  const autoSize = (textArea: HTMLTextAreaElement | undefined) => {
    if (!textArea) return;
    // Reset the height, which helps with scaling down when removing content
    // https://stackoverflow.com/a/25621277/4973029
    textArea.style.height = '0';
    // The 3px helps avoid showing a scrollbar when the content shouldn't be scrollable
    textArea.style.height = textArea.scrollHeight + 3 + 'px';
  };

  /** The draft key of the chat that is currently open, if any. */
  const currentDraftKey = () => draftKey(page.params.chatId, page.url.searchParams.get('id'));

  const showChatError = (exception: unknown, details?: string) => {
    logger.error(exception);
    state.error = exception;
    try {
      // Catch errors, in case any of the data accessors fail
      state.errorDetails =
        details ??
        JSON.stringify(
          {
            sender: get(user)?.id,
            chatId: page.params.chatId,
            idParam: page.url.searchParams.get('id'),
            partnerId: get(partner)?.id,
            ua: typeof navigator !== 'undefined' && navigator.userAgent
          },
          null,
          2
        );
    } catch (e) {
      logger.error(e);
      Sentry.captureException(e, {
        extra: {
          context: 'Error while formatting chat error details',
          originalError: exception
        }
      });
    }
    state.showErrorModal = true;
  };

  export const send = async () => {
    if (!typedMessage) {
      state.hint = get(_)('chat.notify.empty-message');
      return;
    }
    state.isSending = true;
    state.hint = '';
    // A new chat goto()s to its created chat id below, which changes the key.
    const draftKeyBeforeSend = currentDraftKey();
    const chat = get(sharedChat);
    if (!chat) {
      try {
        const newChatId = await createChat(
          page.url.searchParams.get('id') || '',
          normalizeWhiteSpace(typedMessage)
        );
        state.sendWasSuccessful = true;
        trackEvent(PlausibleEvent.SEND_REQUEST);
        goto(get(lr)(`${routes.CHAT}/${page.params.name}/${newChatId}`));
      } catch (ex) {
        Sentry.captureException(ex, {
          extra: {
            context: 'Creating new chat'
          }
        });
        showChatError(ex);
      }
    } else {
      try {
        await sendMessage(chat.id, normalizeWhiteSpace(typedMessage));
        state.sendWasSuccessful = true;
        // The first uid in the users array is the requester/traveller
        trackEvent(PlausibleEvent.SEND_RESPONSE, { role: get(role) });
      } catch (ex) {
        Sentry.captureException(ex, {
          extra: {
            context: 'Sending message in existing chat'
          }
        });
        showChatError(ex);
      }
    }

    // Reactivates the send button
    state.isSending = false;

    // Note: the below still run after a goto() from a new chat to an instantiated one, and,
    // we're staying on the same template

    // Reset the text area on success
    if (sendWasSuccessful) {
      state.typedMessage = '';
      // The message is out: there is nothing left to keep as a draft. Sending is
      // one of the moments the chat list line is re-decided, so hold it again -
      // at the now empty draft.
      clearDraft(draftKeyBeforeSend);
      holdDraftListing(draftKeyBeforeSend);
      if (state.textArea) {
        state.textArea.style.height = '0';
      }
    }
    // Scroll down in the chats list
    scrollDownMessages();

    const COOKIE_FIRST_REMINDER_DAYS = 30;
    // TODO: test if this appears after a new message to a new person
    // Show instructions notifications after sending message as a traveller
    // TODO take into account existing notifs
    const cookie = getCookie(NOTIFICATION_PROMPT_DISMISSED_COOKIE);
    if (
      // 1st group: device conditions
      // On native, show if not enabled anywhere yet
      ((isNative && !hasOrHadEnabledNativeNotificationsSomewhere()) ||
        // On mobile web, always try to show. If the user has the app already,
        // it's unlikely they get here due to deep links).
        isMobileWebDevice) &&
      // 2nd group: only show if the user hasn't just seen it
      (!cookie ||
        // The cookie == "true" means it was dismissed for 6 months
        (cookie != 'true' &&
          // Otherwise, it must hold a creation timestamp
          new Date().getTime() - new Date(cookie).getTime() >
            COOKIE_FIRST_REMINDER_DAYS * 24 * 60 * 60 * 1000))
    ) {
      state.showNotificationPrompt = true;
    }
  };

  export const keydownHandler = async (evt: KeyboardEvent) => {
    const os = uaInfo!.os;
    // @ts-ignore
    const modKey = [OS.MACOS, OS.IOS].includes(os.name) ? evt.metaKey : evt.ctrlKey;
    if (!modKey) return;
    if (evt.code === 'Enter') {
      await send();
      // Disabled text areas can not be focused.
      // Wait until the textArea is re-enabled at the end of send(), before trying to refocus it.
      state.textArea?.focus();
    }
  };
</script>

<script lang="ts">
  // ── Per-chat drafts ───────────────────────────────────────────────────────
  // The message box holds one chat's text at a time, but its state is shared
  // across chats (module scope, and it outlives navigation). Switching chats
  // therefore has to hand the typed text over to the draft of the chat we leave,
  // and load the draft of the chat we open.
  let activeDraftKey = $derived(draftKey(page.params.chatId, page.url.searchParams.get('id')));
  // The chat whose draft is in the box right now. Not reactive on purpose: it
  // only records which handover has already been applied.
  let loadedDraftKey: string | null = null;

  /** Hands the box over from the chat we were on to the one that is now open. */
  const loadDraftIntoBox = (key: string | null) => {
    if (key === loadedDraftKey) return;
    // Text typed for the chat we're leaving was stored on every input already;
    // only a draft of pure whitespace/newlines is not worth keeping.
    clearDraftIfBlank(loadedDraftKey);
    loadedDraftKey = key;
    state.typedMessage = getDraft(key);
    // Keep this chat's list line on the draft it has right now: opening a chat
    // doesn't take its draft off the list, and typing doesn't move it either.
    holdDraftListing(key);
    // A programmatic value change doesn't fire `input`, so size the box ourselves
    // once the new value has rendered.
    tick().then(() => autoSize(state.textArea));
  };

  // Restore before the first render: the box' state is shared and outlives
  // navigation, so it can still hold the text of the chat we came from.
  // Read through currentDraftKey() here — the derived above is only meant to be
  // read reactively.
  loadDraftIntoBox(currentDraftKey());

  // And hand it over again on every switch to another chat, which keeps this
  // component mounted. Only the open chat is a dependency here — the drafts
  // themselves change on every keystroke.
  $effect(() => {
    const key = activeDraftKey;
    untrack(() => loadDraftIntoBox(key));
  });

  onDestroy(() => {
    // Leaving the chat routes entirely (the drafts themselves are kept)
    clearDraftIfBlank(loadedDraftKey);
    releaseDraftListing();
    flushDrafts();
    loadedDraftKey = null;
  });

  // TODO: is this the right place of this effect?
  // It's here because the post-send NotificationPrompt logic is here too
  $effect(() => {
    // If the current device enables a push registration, close the NotificationPrompt
    // It may not be close if notifications are denied, then the first handleNotificationEnableAttempt
    // will return `false`.
    if (
      $pushRegistrations.some(
        (pR) =>
          isNativePushRegistration(pR) &&
          pR.deviceId === $deviceId &&
          pR.status === PushRegistrationStatus.ACTIVE
      )
    ) {
      state.showNotificationPrompt = false;
    }
  });
</script>

<textarea
  placeholder={$_('chat.type-message')}
  name="message"
  bind:value={state.typedMessage}
  bind:this={state.textArea}
  disabled={state.isSending}
  onkeydown={keydownHandler}
  oninput={({ currentTarget }) => {
    autoSize(currentTarget);
    // Store the draft of this chat while typing. Persisting it to localStorage
    // is debounced inside setDraft().
    setDraft(activeDraftKey, currentTarget.value);
  }}></textarea>

<style>
  textarea {
    grid-area: textarea;
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
    /* Disable manual resizing, since we adapt to the text automatically */
    resize: none;
    transition: border 300ms ease-in-out;
  }

  textarea:focus {
    border: 1px solid var(--color-green);
  }
</style>

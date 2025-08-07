<script module lang="ts">
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
  import { canHaveWebPushSupport, hasNotificationSupportNow } from '$lib/util/push-registrations';
  import { hasOrHadEnabledNotificationsSomewhere } from '$lib/api/push-registrations';
  import { isMobileDevice, uaInfo } from '$lib/util/uaInfo';
  import { chat as sharedChat, role, scrollDownMessages, partner } from './_shared.svelte';
  import { NOTIFICATION_PROMPT_DISMISSED_COOKIE } from '$lib/constants';
  import { OS } from 'ua-parser-js/enums';
  import logger from '$lib/util/logger';

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

  const showChatError = (exception: unknown, details?: string) => {
    logger.error(exception);
    state.error = exception;
    try {
      // Catch errors, in case any of the data accessors fail
      state.errorDetails =
        details ??
        JSON.stringify(
          {
            sender: get(user)?.uid,
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
      // Only show if we haven't enabled notifications anywhere yet
      !hasOrHadEnabledNotificationsSomewhere() &&
      // Only show if we are on desktop, or we are on a mobile with potential support
      (hasNotificationSupportNow() || canHaveWebPushSupport() || !isMobileDevice) &&
      // Only show if the user hasn't just seen it
      (!cookie ||
        // The cookie == "true" means it was dismissed for 6 monthts
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

<textarea
  placeholder={$_('chat.type-message')}
  name="message"
  bind:value={state.typedMessage}
  bind:this={state.textArea}
  disabled={state.isSending}
  onkeydown={keydownHandler}
  oninput={({ target }) => {
    // @ts-ignore
    if (target?.style) {
      // Reset the height, which helps with scaling down when removing content
      // https://stackoverflow.com/a/25621277/4973029
      // @ts-ignore
      target.style.height = 0;
      // The 3px helps avoid showing a scrollbar when the content shouldn't be scrollable
      // @ts-ignore
      target.style.height = state.textArea?.scrollHeight + 3 + 'px';
    }
  }}
></textarea>

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

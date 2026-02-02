import { page } from '$app/stores';
import { hasGarden } from '$lib/api/garden';
import { user } from '$lib/stores/auth';
import { chats, newConversation } from '$lib/stores/chat';
import { PlausibleEvent } from '$lib/types/Plausible';
import { trackEvent } from '$lib/util';
import logger from '$lib/util/logger';
import { derived, get } from 'svelte/store';
/**
 * The chat ID of the currently selected chat.
 * Equal to 'new' in case of a new chat. The UID of the recipient is then in the query param 'id'.
 */

/**
 * Function getting the currently selected chat, if it exists.
 * Undefined if chatId === 'new'
 */
export const chat = derived([chats, page], ([$chats, $page]) => $chats[$page.params.chatId ?? '']);

export const role = derived([chat, user], ([$chat, $user]) =>
  ($chat?.users[0] ?? 'invalid') === $user?.id ? 'traveller' : 'host'
);

/**
 * Partner info, whether for an existing chat or a new chat
 */
export const partner = derived(
  [chat, newConversation, user],
  ([$chat, $newConversation, $user]) => {
    const lChat = $chat;
    if (lChat) {
      return {
        id: lChat.users.find((id) => $user?.id !== id)!,
        name: lChat.partner.firstName
      };
    } else if ($newConversation) {
      return {
        ...$newConversation,
        id: $newConversation.partnerId
      };
    }
    return undefined;
  }
);

export const state = $state<{
  messageContainer: HTMLDivElement | undefined;
  // TODO use this instead, undefined means not loaded yet
  // Map of parter ids to hasGarden lookups
  partnerHasGarden: { [id: string]: boolean };
  // If we can't chat, then move back to whatever the previous location was
  // Usually, this would be the garden from which the chat was attempted to be opened.
  membershipModalClosedByOutsideClick: boolean;
}>({
  messageContainer: undefined,
  partnerHasGarden: {},
  membershipModalClosedByOutsideClick: false
});

let msgContCurr = $derived(state.messageContainer);

export const scrollDownMessages = () => {
  if (msgContCurr) {
    msgContCurr.scrollTo(0, msgContCurr.scrollHeight - msgContCurr.offsetHeight);
  }
};

export const loadPartner = () => {
  // variables are initialized
  const lPartner = get(partner);

  if (!lPartner) {
    throw new Error('Unexpected error: no chat partner found. All chats must have two members.');
  }
  if (state.partnerHasGarden[lPartner.id] == null) {
    // no cached value available yet
    hasGarden(lPartner.id)
      .then((response) => {
        state.partnerHasGarden[lPartner.id] = response;
      })
      .catch((err) => {
        // something went wrong just act like partner has no garden
        logger.error(err);
        state.partnerHasGarden[lPartner.id] = false;
      });
  }
};

export const backNavHandler = () => {
  // Detect if the user uses the browser's back nav button
  // Document contains the target. We're interested in detecting navigation back to the garden side drawer.
  if (document.location.pathname.includes('/explore/garden')) {
    trackEvent(PlausibleEvent.MEMBERSHIP_MODAL_BACK, {
      // The "outside click" will also trigger window.history.back(), which will also run this code
      // We can differentiate a browser back button and the modal outside click by marking the outside click.
      source: state.membershipModalClosedByOutsideClick ? 'chat_close' : 'chat_browser'
    });
  }

  // Remove the handler
  window.removeEventListener('popstate', backNavHandler);
};

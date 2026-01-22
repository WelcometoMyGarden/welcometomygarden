import { observeMessagesForChat } from '$lib/api/chat';
import type User from '$lib/models/User';
import { user } from '$lib/stores/auth';
import type { LocalChat } from '$lib/types/Chat';

let unsubscribeFromMessageListener: (() => void) | null = $state(null);
let messageListenerRegisteredForChatId: string | null = $state(null);

/**
 * Does _not_ take care of unregistering existing listeners
 */
export const registerMessageListenerForChat = (chat: LocalChat) => {
  unsubscribeFromMessageListener = observeMessagesForChat(chat.id);
  messageListenerRegisteredForChatId = chat.id;
};

export const updateMessageListeners = (user: User, chat: LocalChat | null | undefined) => {
  if (user && chat) {
    if (!unsubscribeFromMessageListener && !messageListenerRegisteredForChatId) {
      // Registering first message observer
      registerMessageListenerForChat(chat);
    }
    if (unsubscribeFromMessageListener && messageListenerRegisteredForChatId !== chat.id) {
      // The user changed the selected chat: change the message listener registration
      unsubscribeFromMessageListener();
      registerMessageListenerForChat(chat);
    }
  }
};

export const cleanupMessageListeners = () => {
  if (unsubscribeFromMessageListener) unsubscribeFromMessageListener();
  unsubscribeFromMessageListener = null;
  messageListenerRegisteredForChatId = null;
};

// Cleanup message listeners on logout
user.subscribe(($user) => {
  if (!$user && unsubscribeFromMessageListener) {
    cleanupMessageListeners();
  }
});

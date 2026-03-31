import type { NewConversation, LocalChat, LocalMessage } from '$lib/types/Chat';
import { user } from './auth';
import { writable, get, derived } from 'svelte/store';
import { setBadgeCount } from '$lib/util/badge';
import { PushNotifications } from '@capacitor/push-notifications';
import { isNative } from '$lib/util/uaInfo';
import * as Sentry from '@sentry/sveltekit';
import { localNativeRegistrationFCMToken } from './pushRegistrations';
import logger from '$lib/util/logger';

export const hasInitialized = writable(false);
export const creatingNewChat = writable(false);

/**
 * The new chat that is being created
 */
export const newConversation = writable<NewConversation>(null);

export const chats = writable<{ [chatId: string]: LocalChat }>({});

/**
 * Is null if logged out, or the chats have not loaded yet
 */
export const chatsCountWithUnseenMessages = derived(
  [chats, user, hasInitialized],
  ([$chats, $user]) => {
    if (!$user || !hasInitialized) {
      return null;
    }
    return Object.entries($chats).reduce((chatsWithUnseenMessages, [, chat]) => {
      const hasUnseenMessage = chat.lastMessageSender != $user.id && chat.lastMessageSeen === false;
      if (hasUnseenMessage) {
        return chatsWithUnseenMessages + 1;
      }
      return chatsWithUnseenMessages;
    }, 0);
  }
);

/**
 * Adds or updates the chat. Chats are overwritten by referencing their chat id.
 */
export const addChat = (chat: LocalChat) => {
  chats.update((old) => ({
    ...old,
    [chat.id]: chat
  }));
};

export const removeChat = (chatId: string) => {
  chats.update((old) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [chatId]: toRemove, ...others } = old;
    return others;
  });
};

/**
 * Sorts chats in ascending order time-wise */
const sortBySentDate = (m1: LocalMessage, m2: LocalMessage) =>
  m1.createdAt.toMillis() - m2.createdAt.toMillis();

export const messages = writable<{ [chatId: string]: LocalMessage[] }>({});

/**
 * Adds a new message to the local store of chat messages.
 * If the message already exists, it will be overwritten.
 */
export const addMessage = (chatId: string, message: LocalMessage) => {
  const chat = get(chats)[chatId];
  if (!chat) return;
  messages.update((old) => {
    const newMessages = { ...old };
    if (!old[chatId]) {
      // If the chat is empty, we can just add the single message.
      newMessages[chatId] = [message];
    } else {
      newMessages[chatId] = [
        ...newMessages[chatId].filter((existingMessage) => existingMessage.id !== message.id),
        message
      ].sort(sortBySentDate);
    }
    return newMessages;
  });
};

/**
 * Gets the first (and hopefully only) chat that the currently logged in user has with the given uid.
 */
export const getChatForUser = (uid: string) => {
  const all = get(chats);
  return Object.keys(all).find((chatId) => {
    const chat = all[chatId];
    return chat.users.includes(uid);
  });
};

export const resetChatStores = () => {
  hasInitialized.set(false);
  creatingNewChat.set(false);
  chats.set({});
  messages.set({});
};

/**
 * Badge status synchronization should only happen after
 */
export const chatsCountWithUnseenMessagesAfterNativeRegistration = derived(
  [localNativeRegistrationFCMToken, hasInitialized, chatsCountWithUnseenMessages],
  ([$localNativeRegistrationFCMToken, $hasInitialized, $chatsCountWithUnseenMessages]) => {
    if (!$hasInitialized || !$localNativeRegistrationFCMToken) {
      return null;
    }
    return $chatsCountWithUnseenMessages;
  }
);

/**
 * Subscribes to chatsCountWithUnseenMessagesAfterNativeRegistration and keeps the OS badge in sync,
 * Also clears the notification tray when count reaches 0.
 * Returns an unsubscribe function.
 */
export const initBadgeSync = (): (() => void) => {
  const unsubscribe = chatsCountWithUnseenMessagesAfterNativeRegistration.subscribe((count) => {
    if (typeof count === 'number') {
      logger.debug('Setting badge count', count);
      setBadgeCount(count);
      if (count === 0 && isNative) {
        try {
          PushNotifications.removeAllDeliveredNotifications();
        } catch (e) {
          Sentry.captureException(e);
        }
      }
    }
  });
  return unsubscribe;
};

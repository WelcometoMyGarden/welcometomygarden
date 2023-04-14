import type { LocalChat, LocalMessage } from '$lib/types/Chat';
import { user } from './auth.js';
import { writable, get, derived } from 'svelte/store';

export const hasInitialized = writable(false);
export const creatingNewChat = writable(false);

export const chats = writable<{ [chatId: string]: LocalChat }>({});

// Make sure the unseen message count also updates when the user changes
export const chatsCountWithUnseenMessages = derived([chats, user], ([$chats, $user]) =>
  Object.entries($chats).reduce((chatsWithUnseenMessages, [, chat]) => {
    if (!$user) {
      return 0;
    }
    const hasUnseenMessage = chat.lastMessageSender != $user.id && chat.lastMessageSeen === false;
    if (hasUnseenMessage) {
      return chatsWithUnseenMessages + 1;
    }
    return chatsWithUnseenMessages;
  }, 0)
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
 * Sorts chats in descending order. This might be unintuitive (we want to show them in ascending order!),
 * but it is necessary to use `flex-direction: column-reverse` in the UI.
 * See src/routes/chat/[name]/[chatId]/+page.svelte
 */
const sortBySentDate = (m1: LocalMessage, m2: LocalMessage) =>
  m2.createdAt.toMillis() - m1.createdAt.toMillis();

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

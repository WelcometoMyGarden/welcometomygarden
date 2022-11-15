import { writable, get } from 'svelte/store';

export const hasInitialized = writable(false);
export const creatingNewChat = writable(false);

export const chats = writable({});
export const addChat = (chat) => {
  chats.update((old) => ({
    ...old,
    [chat.id]: chat
  }));
};

const sortBySentDate = (m1, m2) => m2.createdAt - m1.createdAt;

export const messages = writable({});
export const addMessage = (chatId, message) => {
  const chat = get(chats)[chatId];
  if (!chat) return;
  messages.update((old) => {
    const newMessages = { ...old };
    if (!old[chatId]) newMessages[chatId] = [message];
    else {
      newMessages[chatId] = [...newMessages[chatId], message].sort(sortBySentDate);
    }
    return newMessages;
  });
};

export const getChatForUser = (uid) => {
  const all = get(chats);
  return Object.keys(all).find((chatId) => {
    const chat = all[chatId];
    return chat.users.includes(uid);
  });
};

import { writable, get } from 'svelte/store';

export const initializing = writable(false);
export const creatingNewChat = writable(false);

export const chats = writable({});
export const addChat = (chat) => {
  chats.set({ ...get(chats), [chat.id]: chat });
};
export const addMessage = (chatId, message) => {
  if (!get(chats)[chatId]) return;
  const messages = get(chats)[chatId].messages;
  if (!messages) chats.set({ ...chats, messages: [message] });
  else chats.set({ ...chats, messages: [...messages, message] });
};

export const getChatsForUser = (uid) => {
  const all = get(chats);
  return Object.keys(chats).find((id) => {
    const chat = all[id];
    return chat && chat.users.includes(uid);
  });
};

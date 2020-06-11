import { writable, get } from 'svelte/store';

const initializing = writable(false);
const creatingNewChat = writable(false);

const chats = writable({});

const addChat = (chat) => {
  chats.set({ ...get(chats), [chat.id]: chat });
};

const addMessage = () => {};

export { initializing, creatingNewChat, addChat, addMessage };

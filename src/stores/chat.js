const data = {
  1: {
    id: 1,
    recipient: 'Dries',
    lastMessage: 'Is your garden still available on June 3rd, because I was thinking about',
    lastActivity: 1
  },
  2: {
    id: 2,
    recipient: 'Manon',
    lastMessage: 'Is your garden still available on June 3rd, because I was thinking about',
    lastActivity: 2
  },
  3: {
    id: 3,
    recipient: 'Marie',
    lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
  },
  4: {
    id: 4,
    recipient: 'Janneke',
    lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
  },
  5: {
    id: 5,
    recipient: 'Brent',
    lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
  },
  6: {
    id: 6,
    recipient: 'Brent',
    lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
  },
  7: {
    id: 7,
    recipient: 'Michiel',
    lastMessage: 'Is your garden still available on June 3rd, because I was thinking about'
  }
};

import { writable } from 'svelte/store';

const initialized = writable(false);
const conversationData = writable(data);

export { initialized, conversationData };

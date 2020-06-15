import { writable } from 'svelte/store';

export const notification = writable();

const send = (message, type = 'info', timeout) => {
  notification.set({ type, message, timeout });
};

const danger = (msg, timeout) => {
  send(msg, 'danger', timeout);
};

const warning = (msg, timeout) => {
  send(msg, 'warning', timeout);
};

const info = (msg, timeout) => {
  send(msg, 'info', timeout);
};

const success = (msg, timeout) => {
  send(msg, 'success', timeout);
};

export default { danger, warning, info, success };

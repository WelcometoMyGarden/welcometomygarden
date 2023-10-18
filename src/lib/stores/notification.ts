import { writable } from 'svelte/store';

export const notification = writable();

const send = (message: string, type = 'info', timeout: number, options = {}) => {
  notification.set({ type, message, timeout, options });
};

type NotificationType = 'danger' | 'warning' | 'info' | 'success';

/**
 * Sends a notification
 * @param message the string to send
 * @param timeout the timeout until the message disappears in milliseconds
 * @param options
 */
type SendFunction = (message: string, timeout?: number, options?: any) => void;

const createSendF: (
  type: NotificationType
  // TODO: type opts
) => SendFunction = (type) => {
  return (msg, timeout = 8000, opts) => {
    send(msg, type, timeout, opts);
  };
};

const danger = createSendF('danger');
const warning = createSendF('warning');
const info = createSendF('info');
const success = createSendF('success');

export default { danger, warning, info, success };

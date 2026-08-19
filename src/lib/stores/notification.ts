import { writable } from 'svelte/store';

export type NotificationType = 'danger' | 'warning' | 'info' | 'success';

export interface NotificationOptions {
  /** Optional click handler invoked when the toast is clicked. */
  click?: (() => void) | null;
}

export interface Notification {
  type: NotificationType;
  message: string;
  timeout: number;
  options: NotificationOptions;
}

export const notification = writable<Notification | undefined>();

const send = (
  message: string,
  type: NotificationType = 'info',
  timeout: number,
  options: NotificationOptions = {}
) => {
  notification.set({ type, message, timeout, options });
};

/**
 * Sends a notification
 * @param message the string to send
 * @param timeout the timeout until the message disappears in milliseconds
 * @param options
 */
type SendFunction = (message: string, timeout?: number, options?: NotificationOptions) => void;

const createSendF: (type: NotificationType) => SendFunction = (type) => {
  return (msg, timeout = 8000, opts) => {
    send(msg, type, timeout, opts);
  };
};

const danger = createSendF('danger');
const warning = createSendF('warning');
const info = createSendF('info');
const success = createSendF('success');

export default { danger, warning, info, success };

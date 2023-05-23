import { writable } from 'svelte/store';

export const notification = writable();

const send = (message: string, type = 'info', timeout: number, options = {}) => {
  notification.set({ type, message, timeout, options });
};

type NotificationType = 'danger' | 'warning' | 'info' | 'success';

const createSendF: (
  type: NotificationType
  // TODO: type opts
) => (message: string, timeout: number, opts?: any) => void = (type) => {
  return (msg, timeout, opts) => {
    send(msg, type, timeout, opts);
  };
};

const danger = createSendF('danger');
const warning = createSendF('warning');
const info = createSendF('info');
const success = createSendF('success');

export default { danger, warning, info, success };

// TODO: replace all instances of regex search goto\(.*routes.SIGN_IN

import { _ } from 'svelte-i18n';
import routes from '$lib/routes';
import { goto } from './navigate';
import notify from '$lib/stores/notification';
import { get } from 'svelte/store';

/**
 * Redirect to the sign-in page, then optionally continue to the given URL with the given toast.
 */
export default async (options?: {
  continueUrl?: string;
  toastMessage?: string;
  toastDuration?: string;
  gotoOpts?: Parameters<typeof goto>[1];
}) => {
  const defaultOptions = {
    continueUrl: undefined,
    toastMessage: get(_)('auth.unsigned'),
    toastDuration: 8000,
    gotoOpts: undefined
  };
  const { continueUrl, toastMessage, toastDuration, gotoOpts } = { ...defaultOptions, ...options };
  notify.info(toastMessage, toastDuration);
  await goto(
    `${routes.SIGN_IN}${continueUrl ? `?continueUrl=${encodeURIComponent(continueUrl)}` : ''}`,
    gotoOpts
  );
};

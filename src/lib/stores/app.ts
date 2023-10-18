import { derived, writable } from 'svelte/store';
import { isInitializingFirebase, isUserLoading } from './auth';
import { isLoading as isLocaleLoading } from 'svelte-i18n';
import type { ComponentType } from 'svelte';
import { isOnIDevicePWA } from '$lib/api/push-registrations';

export const handledOpenFromIOSPWA = writable(false);

export const appHasLoaded = derived(
  [isInitializingFirebase, isLocaleLoading, isUserLoading, handledOpenFromIOSPWA],
  ([$isInitializingFirebase, $isLocaleLoading, $isUserLoading, $handledOpenFromIOSPWA]) => {
    const _isOnIDevicePWA = isOnIDevicePWA();
    return (
      !$isInitializingFirebase &&
      !$isLocaleLoading &&
      !$isUserLoading &&
      // Don't show iOS PWA app UI until we are ready handling it, and on the right route.
      // this avoids a potential seconds-long flash of the homescreen (or other screen) before
      // being redirected to the chats page, when the user has unread chats.
      (!_isOnIDevicePWA || (_isOnIDevicePWA && $handledOpenFromIOSPWA))
    );
  }
);

/**
 * A modal to be shown in the root. Children can use getContext('simple-modal')
 * to overwrite this modal.
 */
export const rootModal = writable<ComponentType | null>(null);

export const close = () => rootModal.set(null);

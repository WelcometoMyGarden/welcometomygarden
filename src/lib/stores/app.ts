import { derived, writable } from 'svelte/store';
import { isInitializingFirebase, isUserLoading } from './auth';
import { isLoading as isLocaleLoading } from 'svelte-i18n';
import type { ComponentType } from 'svelte';

export const appHasLoaded = derived(
  [isInitializingFirebase, isLocaleLoading, isUserLoading],
  ([$isInitializingFirebase, $isLocaleLoading, $isUserLoading]) =>
    !$isInitializingFirebase && !$isLocaleLoading && !$isUserLoading
);

/**
 * A modal to be shown in the root. Children can use getContext('simple-modal')
 * to overwrite this modal.
 */
export const rootModal = writable<ComponentType | null>(null);

export const close = () => rootModal.set(null);

export const handledOpenFromIOSPWA = writable(false);

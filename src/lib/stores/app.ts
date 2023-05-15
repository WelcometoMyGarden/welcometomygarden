import { derived } from 'svelte/store';
import { isInitializingFirebase, isUserLoading } from './auth';
import { isLoading as isLocaleLoading } from 'svelte-i18n';

export const appHasLoaded = derived(
  [isInitializingFirebase, isLocaleLoading, isUserLoading],
  ([$isInitializingFirebase, $isLocaleLoading, $isUserLoading]) =>
    !$isInitializingFirebase && !$isLocaleLoading && !$isUserLoading
);

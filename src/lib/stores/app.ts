import { derived, writable } from 'svelte/store';
import { isInitializingFirebase, isUserLoading, user } from './auth';
import { isLoading as isLocaleLoading } from 'svelte-i18n';
import type { ComponentType } from 'svelte';
import { isOnIDevicePWA } from '$lib/api/push-registrations';
import { subscriptionJustEnded } from './subscription';
import createUrl from '$lib/util/create-url';
import { coerceToMainLanguageENBlank } from '$lib/util/get-browser-lang';

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

/**
 * The garden layer loads in an async way.
 * This observable is useful to know when it is possible to add layers on top of it.
 */
export const gardenLayerLoaded = writable(false);
//
// Whether the top banner should be shown, logic to be defined
// Show when the user is a superfan or host
// subscriptionJustEnded should probably remain in the logic
export const shouldShowBanner = derived(
  [user, subscriptionJustEnded],
  ([$user, $subscriptionJustEnded]) =>
    // NOTE: if we want to disable this, it is probably best to just keep $subscriptionJustEnded in the condition
    $subscriptionJustEnded || $user?.superfan === true || $user?.garden != null
);

export const bannerLink = derived(user, ($user) =>
  !$user
    ? ''
    : createUrl(
        `https://share.welcometomygarden.org/${coerceToMainLanguageENBlank($user?.communicationLanguage)}`,
        {
          wtmg: $user.id,
          ref: 'wtmgbanner'
        }
      )
);

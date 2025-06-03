import * as Sentry from '@sentry/sveltekit';
import { derived, writable } from 'svelte/store';
import { isInitializingFirebase, isSigningIn, isUserLoading, user } from './auth';
import { isLoading as isLocaleLoading } from 'svelte-i18n';
import type { ComponentType } from 'svelte';
import { subscriptionJustEnded } from './subscription';
import createUrl from '$lib/util/create-url';
import { coerceToMainLanguageENBlank } from '$lib/util/get-browser-lang';
import { isOnIDevicePWA } from '$lib/util/push-registrations';

export const handledOpenFromIOSPWA = writable(false);

export const appHasLoaded = derived(
  [isInitializingFirebase, isLocaleLoading, isUserLoading, isSigningIn, handledOpenFromIOSPWA],
  ([
    $isInitializingFirebase,
    $isLocaleLoading,
    $isUserLoading,
    $isSigningIn,
    $handledOpenFromIOSPWA
  ]) => {
    const _isOnIDevicePWA = isOnIDevicePWA();
    return (
      !$isInitializingFirebase &&
      !$isLocaleLoading &&
      // While signing in, the user will be loaded or reloaded. This will set $isUserLoading to false, and then back to true
      // Since this derived store controls the root layout, this cycle from true -> false -> true will destroy, and then re-mount, the current page we are on
      // (probably /sign-in or /register). This is unintuitive, and may break assumptions elsewhere on the lifecycle of pages or layouts.
      // By allowing the user to not be loaded while signing in, we prevent this cycle from occurring.
      (!$isUserLoading || $isSigningIn) &&
      // Don't show iOS PWA app UI until we are ready handling it, and on the right route.
      // this avoids a potential seconds-long flash of the homescreen (or other screen) before
      // being redirected to the chats page, when the user has unread chats.
      (!_isOnIDevicePWA || (_isOnIDevicePWA && $handledOpenFromIOSPWA))
    );
  }
);

Sentry.startSpan(
  {
    name: 'App Load',
    op: 'app.load'
  },
  () =>
    new Promise((resolve) => {
      const unsub = appHasLoaded.subscribe((v) => {
        if (v) {
          unsub();
          resolve(true);
        }
      });
    })
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
  // NOTE: if we want to not show the "general" banner, it is probably best to just keep $subscriptionJustEnded in the condition
  // ([$user, $subscriptionJustEnded]) =>
  //   $subscriptionJustEnded || $user?.superfan === true || $user?.garden != null
  ([_, $subscriptionJustEnded]) => $subscriptionJustEnded
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

import { derived, writable } from 'svelte/store';
import { createChatObserver } from '$lib/api/chat';
import { getCookie, setCookie } from '$lib/util';
import { resolveOnUserLoaded, user } from '$lib/stores/auth';
import { resetChatStores } from '$lib/stores/chat';
import { coerceToValidLangCode } from '$lib/util/get-browser-lang';
import { updateCommunicationLanguage } from '$lib/api/user';
import IosNotificationPrompt from '$lib/components/Notifications/IOSPWANotificationModal.svelte';
import {
  createPushRegistrationObserver,
  getCurrentNativeSubscription
} from '$lib/api/push-registrations';
import { isOnIDevicePWA } from '$lib/util/push-registrations';
import { NOTIFICATION_PROMPT_DISMISSED_COOKIE } from '$lib/constants';
import { resetPushRegistrationStores } from '$lib/stores/pushRegistrations';
import { locale } from 'svelte-i18n';
import { handledOpenFromIOSPWA, rootModal } from './app';
import { createAuthObserver } from '$lib/api/auth';
import { invalidateAll } from '$app/navigation';
import logger from '$lib/util/logger';

export const updatingMailPreferences = writable(false);
export const updatingSavedGardens = writable(false);

let hasShownIOSNotificationsModal = false;

type MaybeUnsubscriberFunc = (() => void) | undefined;

let unsubscribeFromAuthObserver: MaybeUnsubscriberFunc;
let unsubscribeFromChatObserver: MaybeUnsubscriberFunc;
let unsubscribeFromPushRegistrationObserver: MaybeUnsubscriberFunc;

const userLocale = derived([user, locale], ([$user, $locale]) => [$user, $locale] as const);

/**
 * Firebase Auth observers should have been
 *
 * This method does not do cleanup of subscribers, since it should only be called once
 * in the app lifecycle.
 */
export const initializeUser = async () => {
  if (!unsubscribeFromAuthObserver) {
    unsubscribeFromAuthObserver = createAuthObserver();
  }

  // Wait until the user is loaded (TODO: the sync/async assumptions may not hold here)
  await resolveOnUserLoaded();

  // React to user changes
  user.subscribe(async (latestUser) => {
    // Initialize chat & push registrations observers if needed, that is
    // if the user logged in and has a verified email, or if the user has changed
    if (!!latestUser) {
      if (latestUser.emailVerified) {
        // Without a verified email: no access to messages, no garden, no chats
        // Subscribe to the chat observer, if not initialized yet
        unsubscribeFromChatObserver = unsubscribeFromChatObserver ?? createChatObserver();
        // Subscribe to the push registration observer, if not initialized yet
        unsubscribeFromPushRegistrationObserver =
          unsubscribeFromPushRegistrationObserver ?? createPushRegistrationObserver();
      } else if (isOnIDevicePWA()) {
        // If the user does not have a verified email, we unblock the loading of the page
        // by marking the open from iOS PWA as handled, since they can not do anything
        // with chats anyway. In other cases, this would be unblocked by the chat observer.
        handledOpenFromIOSPWA.set(true);
      }
    }
    // If the user logged out (or was never logged in)
    if (!latestUser) {
      // Unsubscribe from the chat & push registration observers if they still existed,
      // which means that the user logged out
      if (unsubscribeFromChatObserver) {
        logger.log(`Unsubscribing from chat observer & resetting stores`);
        unsubscribeFromChatObserver();
        unsubscribeFromChatObserver = undefined;
        resetChatStores();
      }

      if (unsubscribeFromPushRegistrationObserver) {
        logger.log(`Unsubscribing from push registrations & resetting stores`);
        unsubscribeFromPushRegistrationObserver();
        unsubscribeFromPushRegistrationObserver = undefined;
        resetPushRegistrationStores();
      }
    }

    // After user login, detect startup on PWA iOS which doesn't have pre-existing push
    // registrations
    // TODO: check if this loads after loading pre-existing push registrations?
    // TODO: make this influence dismissal somehow?
    const notificationsDismissed = getCookie(NOTIFICATION_PROMPT_DISMISSED_COOKIE);
    if (
      // Prevent the modal from being shown twice in the same boot session (we might get multiple user updates)
      !hasShownIOSNotificationsModal &&
      // We're logged in...
      latestUser !== null &&
      // ... the browser has no native sub registered (but support exists)
      (await getCurrentNativeSubscription()) === null &&
      // ... the user hasn't dismissed notifications
      notificationsDismissed !== 'true' &&
      // ... we're on the PWA of a supporting iOS version (preventing this from appearing on Android/... browsers)
      isOnIDevicePWA()
    ) {
      rootModal.set(IosNotificationPrompt);
      hasShownIOSNotificationsModal = true;
    }
  });

  /**
   * Handle the locale
   * - Not all locales are supported. However, we save locales that are not supported too
   * in case we will support them in the future, in both the locale cookie and user data.
   * - The $locale svelte-i18n store can and should also be set to non-supported locales.
   *   In that case, it will report this unsupported value, but internally,
   *   it will always use the fallbackLocale (en) values.
   * - This means that when using/referencing $locale, it is important to combine it with
   *   coerce* methods, or use the $coercedLocale store.
   * - This listens to a derived store, since user updates may influence the locale,
   *   and locale updates may influence the user depending on each of their states.
   *
   *
   * The locale is initialized in the universal root layout.ts loader
   * according to the following priority order:
   *   1. Browser-side: from the cookie cache ()
   *   2. Universal: from the URL path's language parameter
   *   3. default (en)
   * Its initial value is not dependent on user state.
   *
   * Once pre-existing user communcationLanguage data becomes available here,
   * then it is loaded. It overrides all other language signals, and sets the locale cookie.
   *
   * If the locale is manually set by the user, the locale cookie
   * and user data (if applicable) are set (by the locale switcher).
   */
  userLocale.subscribe(async ([latestUser, latestLocale]) => {
    // $locale starts off with null
    if (!latestLocale) {
      return;
    }

    const localeCookie = getCookie('locale');
    if (latestLocale && !latestUser) {
      if (localeCookie) {
        // If there is a cookie
        const validatedCookieLocale = coerceToValidLangCode(localeCookie);
        // Update the locale to match the cookie, when the user is not logged in
        if (validatedCookieLocale !== latestLocale) {
          logger.warn(
            // This should happened in locales/initialize.ts
            'Cookie locale was not equal to latest locale after locale init, this should not occur'
          );
          locale.set(localeCookie);
          // Redirect using the root layout loader
          invalidateAll();
        }
      }
      // If there is no cookie and no user: carry on. Retain the current locale as initialized.
    } else if (latestLocale && latestUser) {
      if (latestUser.communicationLanguage) {
        // If a comm language already exists
        if (
          !localeCookie ||
          (localeCookie && coerceToValidLangCode(localeCookie) !== latestUser.communicationLanguage)
        ) {
          // If there is no cookie yet, or the cookie is not set to the user's language,
          // then set a cookie to avoid language flashes when loading static pages next time
          setCookie('locale', latestUser.communicationLanguage, { path: '/' });
        }

        if (latestLocale !== latestUser.communicationLanguage) {
          // If the locale store isn't up-to-date with the user's data,
          // change it to match the user's language (load the user)
          logger.debug(`Loading locale ${latestUser.communicationLanguage} from the user's data`);
          locale.set(latestUser.communicationLanguage);
          // Redirect if needed
          invalidateAll();
        }
      } else {
        // The comm language does not exist yet
        // Set the user's communication language to the current locale, if there is none set yet
        // This will trigger another `userLocale` update, which will set the related cookie.
        // but for the rest it should be a no-op.
        logger.debug(
          `Initializing the empty locale in the user data to the current locale ${latestLocale}`
        );
        await updateCommunicationLanguage(latestLocale);
      }
    }
  });
  logger.debug('User init setup done');
};

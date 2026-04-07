import { derived, get, writable } from 'svelte/store';
import { createChatObserver } from '$lib/api/chat';
import { getCookie, setCookie } from '$lib/util';
import { isUserLocaleLoaded, resolveOnUserLoaded, user } from '$lib/stores/auth';
import { resetChatStores, initBadgeSync } from '$lib/stores/chat';
import { coerceToValidLangCode } from '$lib/util/get-browser-lang';
import { updateCommunicationLanguage } from '$lib/api/user';
import {
  createFirebasePushRegistrationObserver,
  handleNotificationEnableAttempt,
  hasEnabledNotificationsOnCurrentDevice,
  hasOptedOutOnCurrentNativeDevice
} from '$lib/api/push-registrations';
import { NOTIFICATION_PROMPT_DISMISSED_COOKIE } from '$lib/constants';
import {
  loadedPushRegistrations,
  resetPushRegistrationStores
} from '$lib/stores/pushRegistrations';
import { locale } from 'svelte-i18n';
import { handledOpenFromIOSPWA, localeIsLoaded } from './app';
import { createAuthObserver } from '$lib/api/auth';
import { invalidateAll } from '$app/navigation';
import logger from '$lib/util/logger';
import { isNative, isOnIDevicePWA } from '$lib/util/uaInfo';
import routes, { getCurrentRoute } from '$lib/routes';
import { setupAndroidChannels } from '$lib/api/push-registrations/native';

export const updatingMailPreferences = writable(false);
export const updatingSavedGardens = writable(false);

let isNotificationInitDone = false;

type MaybeUnsubscriberFunc = (() => void) | undefined;

let unsubscribeFromAuthObserver: MaybeUnsubscriberFunc;
let unsubscribeFromChatObserver: MaybeUnsubscriberFunc;
let unsubscribeFromPushRegistrationObserver: MaybeUnsubscriberFunc;
let unsubscribeFromBadgeSync: MaybeUnsubscriberFunc;

const userLocale = derived([user, locale], ([$user, $locale]) => [$user, $locale] as const);

/**
 * When push registrations are loaded, as well as the locale
 */
const remotePushAndLocaleLoaded = derived(
  [loadedPushRegistrations, localeIsLoaded],
  ([$pushLoaded, $localeLoaded]) => $pushLoaded && $localeLoaded
);

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
      // Subscribe to the push registration observer, if not initialized yet
      // We're not making this dependent on email verification status, so new accounts
      // get the prompt immediately.
      unsubscribeFromPushRegistrationObserver =
        unsubscribeFromPushRegistrationObserver ?? createFirebasePushRegistrationObserver();
      if (latestUser.emailVerified) {
        // Without a verified email: no access to viewing or sending chats or messages, can't create a garden
        // Subscribe to the chat observer, if not initialized yet
        unsubscribeFromChatObserver = unsubscribeFromChatObserver ?? createChatObserver();
        // Keep OS badge in sync with unread chat count (dependent on chat count, plus the push registration init above)
        unsubscribeFromBadgeSync = unsubscribeFromBadgeSync ?? initBadgeSync();
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

      if (unsubscribeFromBadgeSync) {
        unsubscribeFromBadgeSync();
        unsubscribeFromBadgeSync = undefined;
      }

      if (unsubscribeFromPushRegistrationObserver) {
        logger.log(`Unsubscribing from push registrations & resetting stores`);
        unsubscribeFromPushRegistrationObserver();
        unsubscribeFromPushRegistrationObserver = undefined;
        resetPushRegistrationStores();
      }
    }
  });

  remotePushAndLocaleLoaded.subscribe(async (loaded) => {
    // We're also waiting for locale load here, because in the native notification setup
    // we use localized values for Android Channel Names
    // Note: push registrations can only be loaded after user data is available (see above)

    if (!loaded) {
      return;
    }

    // Upsert Android channels based on the new locale info
    setupAndroidChannels();

    // After user login, detect startup on PWA iOS or native which doesn't have a pre-existing push registration
    // TODO: check if this loads after loading pre-existing push registrations?
    // TODO: make this influence dismissal somehow?
    const notificationsDismissed = getCookie(NOTIFICATION_PROMPT_DISMISSED_COOKIE);

    // Bail out from further processing under some conditions
    const alreadyHasNotifs = await hasEnabledNotificationsOnCurrentDevice();
    // On native, if the user previously opted out (MARKED_FOR_DELETION registration exists for
    // this device), don't auto-re-register even though OS permission is still granted.
    // See hasOptedOutOnCurrentNativeDevice() and the observer in push-registrations/index.ts.
    const hasOptedOut = hasOptedOutOnCurrentNativeDevice();
    if (
      // Prevent the modal from being shown twice in the app boot session
      // (we might get multiple pushLocale updates, likely not though)
      isNotificationInitDone ||
      // the user has dismissed notifications in the chat
      notificationsDismissed === 'true' ||
      alreadyHasNotifs ||
      hasOptedOut
    ) {
      return;
    }

    // Push notifications are not enabled yet, and we can try enabling them
    if (isNative) {
      // On native platforms with built-in permission prompts (or no prompts), just immediately prompt for permission on user load
      handleNotificationEnableAttempt(false);
    }
    isNotificationInitDone = true;
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
          DEV: logger.debug(
            `Loading locale ${latestUser.communicationLanguage} from the user's data to overwrite local ${latestLocale}`
          );
          // await is important here, otherwise the isUserLocaleLoaded.set(true) below will be triggered
          // before the locale is fully updated
          await locale.set(latestUser.communicationLanguage);
          if (getCurrentRoute() === routes.SIGN_IN) {
            // onIdTokenChanged is responsible for redirection to the user's locale after login
            DEV: logger.debug('Skipping locale invalidation redirect after login');
          } else {
            // Redirect based on the new locale
            invalidateAll();
          }
        }
      } else {
        // The users' comm language does not exist yet.
        // Set the user's communication language to the current locale, if there is none set yet
        // This will trigger another `userLocale` update, which will set the related cookie.
        // but for the rest it should be a no-op.
        DEV: logger.debug(
          `Initializing the empty locale in the user data to the current locale ${latestLocale}`
        );
        await updateCommunicationLanguage(latestLocale);
      }
      // In any case, set that the user's locale was loaded
      if (!get(isUserLocaleLoaded)) {
        DEV: logger.debug('Marking the user locale as loaded to', get(locale));
        isUserLocaleLoaded.set(true);
      }
    }
  });
  DEV: logger.debug('User init setup done');
};

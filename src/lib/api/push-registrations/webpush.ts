import {
  currentWebPushSubStore,
  isEnablingLocalPushRegistration,
  pushRegistrations
} from '$lib/stores/pushRegistrations';
import {
  getDeviceUAWithClientHints,
  handleError,
  handleErrorGeneric,
  hasWebPushNotificationSupportNow,
  pushRegistrationsColRef
} from '$lib/util/push-registrations';
import { isEmpty } from 'lodash-es';
import * as Sentry from '@sentry/sveltekit';
import { getToken } from 'firebase/messaging';
import { messaging } from '../firebase';
import isFirebaseError from '$lib/util/types/isFirebaseError';
import { t } from 'svelte-i18n';
import { get } from 'svelte/store';
import { anchorText } from '$lib/util/translation-helpers';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { PushRegistrationStatus, type WebPushSubscriptionCore } from '$lib/types/PushRegistration';
import removeUndefined from '$lib/util/remove-undefined';
import notification from '$lib/stores/notification';
import { uaInfo } from '$lib/util/uaInfo';
import { timeout } from '$lib/util/timeout';
import logger from '$lib/util/logger';

export const LATEST_PUSH_REGISTRATION_KEY = 'latestPushRegistration';

/**
 * @returns a PushRegistrationJSON object if one exists, null if none exists
 */
export async function getWebPushSubscriptionFromSW(
  serviceWorkerRegistration: ServiceWorkerRegistration
) {
  return await serviceWorkerRegistration.pushManager
    .getSubscription()
    .then((s) => s?.toJSON() || null);
}

/**
 * Tries to unsubscribe the PushSubscription of the current device, if existing.
 * This method should be used as a last resort to clean up a corrupted state, use
 * deletePushRegistration if possible.
 *
 * @returns true on success, false on any kind of failure
 */
export const unsubscribeWebPushRegistration = async () => {
  try {
    const fullNativeSub = await navigator.serviceWorker.ready.then((sW) =>
      sW.pushManager.getSubscription()
    );
    if (!fullNativeSub) {
      logger.log("Couldn't get full native PushSubscription while trying to unsubscribe it.");
    } else {
      const success = await fullNativeSub?.unsubscribe();
      if (success) {
        logger.log('Unregistered (in FB) local native PushSubscription sucessfully unsubscribed.');
        currentWebPushSubStore.set(null);
        return true;
      } else {
        logger.warn(
          'Unregistered (in FB) local native PushSubscription was not sucessfully unsubscribed.'
        );
        // Then we just ignore this one...
      }
    }
    return false;
  } catch (e) {
    logger.warn(
      'Error while trying to unsubscribe an unregistered (in FB) local native PushSubscription',
      e
    );
    Sentry.captureException(e);
  }
};

/**
 * Gets the current push subscription
 * @returns the browser's native PushSubscriptionJSON if one exists.
 *   - undefined or if the browser does not support Push Subscriptions
 *   - null if there is no current subscription, but push subscriptions are supported
 */
export const getCurrentWebPushSubscription = async () => {
  if (!hasWebPushNotificationSupportNow()) {
    return undefined;
  }
  // NOTE: this will fail on Vite development in Firefox
  // It should be possible to detect this rejection on the syntax error if we manually register the
  // service worker, see https://svelte.dev/docs/kit/service-workers
  // In Firefox dev, the service worker will never be ready.
  const sub = await navigator.serviceWorker.ready.then((serviceWorkerRegistration) =>
    getWebPushSubscriptionFromSW(serviceWorkerRegistration)
  );
  // Empirically: iOS Safari may give an empty object, instead of null, when no registration exists.
  if (isEmpty(sub)) {
    currentWebPushSubStore.set(null);
    return null;
  }
  currentWebPushSubStore.set(sub);
  return sub;
};
//
// https://developer.mozilla.org/en-US/docs/Web/API/Notification/permission_static
export const hasDeniedWebPushNotifications = () =>
  hasWebPushNotificationSupportNow() && Notification.permission === 'denied';

/**
 * In case of a new subscription, this method should be called from a user gesture.
 * It will try to ask for permission if none was granted, and throw an error if permissions was denied/blocked.
 * @returns
 */
export const subscribeOrRefreshWebFCM = async () => {
  if (!hasWebPushNotificationSupportNow()) {
    throw new Error('Tried to register push subscription without notification support');
  }
  const serviceWorkerRegistration = await navigator.serviceWorker.ready;

  // Internally, getToken() broadly:
  // 1. Checks for Notification permissions, and **requests** them if not present (leads to a user prompt).
  // 2. Runs `swRegistration.pushManager.getSubscription()` to get an existing sub, or `serviceWorkerRegistration.pushManager.subscribe(options)`
  // 3. It then converts it to a FCM registration to identify this browser and uploads that to FCM;
  //     or checks if a cached indexedDB FCM reg is compatible with the retrieved native sub. If not, it tries to the delete the old cached one, but that might fail https://github.com/firebase/firebase-js-sdk/issues/2364, then creates a new one
  //     or if valid (up-to-date according to FCM idb cache), it will *update* the subscription weekly in FCM.
  //      if this update fails will it unsubscribe the registration in the browser (https://github.com/firebase/firebase-js-sdk/blob/master/packages/messaging/src/internals/token-manager.ts#L104C4-L104C4)
  //      Presumably, this update fails when the token has been deleted in FCM by deleteToken (or Firebase).
  //
  // If the user deactivates notifications via the browser UI, it will also result in an unsubscribe:
  // https://github.com/firebase/firebase-js-sdk/blob/5dac8b37a974309398317c5231ca6a41af2a48a5/packages/messaging/src/listeners/sw-listeners.ts#L58
  // TODO: Tap into this from our own SW as well, to be able to delete our own registration?
  //
  // Safari expects the options: { userVisibleOnly: true } to be set, the FCM implementation does this now:
  // https://github.com/firebase/firebase-js-sdk/blob/5dac8b37a974309398317c5231ca6a41af2a48a5/packages/messaging/src/internals/token-manager.ts#L165C14-L165C14
  const currentToken = await getToken(messaging(), {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY,
    serviceWorkerRegistration: serviceWorkerRegistration
  });
  if (!currentToken) {
    throw new Error(
      'No FCM token was received in a subscribe/refresh operation. This should not happen.'
    );
  }
  // Handle a current registration token (obtained earlier with the Notification.requestPermissions API)
  //
  // We also store the native underlying subscription object, so we might leverage it later.
  // We use the endpoint to uniquely identify a subscription, because we can check its status without side-effects, unlike
  // Messaging's getToken() (see above)
  // Endpoints should uniquely identify a subscription.
  // https://stackoverflow.com/questions/63767889/is-it-safe-to-use-the-p256dh-or-endpoint-keys-values-of-the-push-notificatio/63769192#63769192
  const subscriptionObject = await getWebPushSubscriptionFromSW(serviceWorkerRegistration);
  currentWebPushSubStore.set(subscriptionObject);
  if (!subscriptionObject) {
    throw new Error(
      'Could unexpectedly not retrieve the native Push Subscription object of an existing FCM registration'
    );
  }
  const subscriptionInfo = {
    fcmToken: currentToken,
    subscription: subscriptionObject
  };

  // Cache the current subscription
  localStorage.setItem(LATEST_PUSH_REGISTRATION_KEY, JSON.stringify(subscriptionInfo));

  return subscriptionInfo;
};

/**
 * Creates, and subscribes to, a new push registration.
 * Affects three systems:
 * 1. the native Web Push/Service Worker/browser APIs & subscription objects
 * 2. the Firebase Cloud Messaging backend (kept in sync by messaging() & our SW)
 * 3. our own PushRegistration registry in Firestore
 *
 * @returns
 * - true if the operation was succesful
 * - undefined otherwise
 */
export const createWebPushRegistration = async () => {
  // Start loading state indicator
  isEnablingLocalPushRegistration.set(true);

  let subscriptionCore: WebPushSubscriptionCore;

  // Try to enable the notifications
  try {
    const subscriptionPromise = subscribeOrRefreshWebFCM();
    subscriptionCore = await timeout(
      subscriptionPromise,
      15 * 1000,
      'Registering web push timed out'
    );
  } catch (e) {
    logger.error(e);
    if (isFirebaseError(e) && e.code === 'messaging/permission-blocked') {
      // The user has disabled/blocked permission before, and they tried to enable notifications again now
      // TODO: Inform the user that they should allow permissions via their browser, or "Reset permissions" (Chrome)
      handleErrorGeneric(
        e,
        get(t)('push-notifications.error.permission-denied', {
          values: {
            faqLink: anchorText({
              href: get(t)('push-notifications.error.permission-denied-faq-link'),
              linkText: get(t)('push-notifications.error.permission-denied-faq-text'),
              class: 'link'
            })
          }
        })
      );
      Sentry.captureMessage('messaging/permission-blocked');
    } else {
      handleError(e);
      Sentry.captureException(e);
    }
    return;
  }
  const { fcmToken, subscription } = subscriptionCore;

  // If the resulting push registration was already stored, do not add it again.
  if (get(pushRegistrations).find((pR) => pR.fcmToken === fcmToken)) {
    logger.warn('Tried to add an already-known push registration; this should not happen.');
    handleError(
      undefined,
      'It looks like you already had notifications activated on this browser.'
    );
    return;
  }

  // Add the registration to the Firestore
  try {
    // Get these synchronously for backwards compat
    const { os, browser } = uaInfo!;
    // Client Hints might help detect more about the device (in Chrome)
    // for example: model = 'FP3' instead of 'K' on Dries' FairPhone 3
    // https://docs.uaparser.js.org/v2/api/ua-parser-js/idata/with-client-hints.html

    await addDoc(pushRegistrationsColRef(), {
      status: PushRegistrationStatus.ACTIVE,
      fcmToken,
      subscription,
      ua: removeUndefined({
        os: os.name,
        browser: browser.name,
        // Destructure helps to convert into POJO
        device: removeUndefined({ ...(await getDeviceUAWithClientHints()) })
      }),
      host: location.host,
      createdAt: serverTimestamp(),
      refreshedAt: serverTimestamp()
    });

    // Success
    isEnablingLocalPushRegistration.set(false);
    notification.success(get(t)('push-notifications.registration-success'));
    return true;
  } catch (e) {
    const msg =
      "Your push notifications were sucessfully enabled, but couldn't be added to the database.";
    handleError(e, msg);
    logger.error(msg);
    Sentry.captureException(e);
    return;
  }
};

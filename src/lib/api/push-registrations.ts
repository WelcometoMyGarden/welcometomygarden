import { deleteToken, getToken } from 'firebase/messaging';
import { db, messaging } from './firebase';
import {
  type CollectionReference,
  type DocumentReference,
  type Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { PUSH_REGISTRATIONS, USERS_PRIVATE } from './collections';
import { getUser } from '$lib/stores/auth';
import {
  PushRegistrationStatus,
  type FirebasePushRegistration,
  type LocalPushRegistration
} from '$lib/types/PushRegistration';
import {
  currentNativeSubStore,
  isEnablingLocalPushRegistration,
  loadedPushRegistrations,
  pushRegistrations
} from '$lib/stores/pushRegistrations';
import removeUndefined from '$lib/util/remove-undefined';
import { get } from 'svelte/store';
import isFirebaseError from '$lib/util/types/isFirebaseError';
import { isMobileDevice, uaInfo } from '$lib/util/uaInfo';
import { isEmpty } from 'lodash-es';
import notification from '$lib/stores/notification';
import { t } from 'svelte-i18n';
import { rootModal } from '$lib/stores/app';
import NotificationSetupGuideModal from '$lib/components/Notifications/NotificationSetupGuideModal.svelte';
import ErrorModal from '$lib/components/UI/ErrorModal.svelte';
import { bind } from 'svelte-simple-modal';
import { timeout } from '$lib/util/timeout';
import { UAParser } from 'ua-parser-js';
import { anchorText } from '$lib/util/translation-helpers';
import { emailAsLink } from '$lib/constants';
import { trackEvent } from '$lib/util';
import { PlausibleEvent } from '$lib/types/Plausible';
import {
  canHaveNotificationSupport,
  hasNotificationSupportNow
} from '$lib/util/push-registrations';
import * as Sentry from '@sentry/sveltekit';

const pushRegistrationLoadCheck = () => {
  if (!get(loadedPushRegistrations)) {
    console.warn(
      "Trying to interact with push registrations that haven't loaded yet! This could lead to inconsistencies."
    );
  }
};

/** One day in ms */
const MESSAGING_REFRESH_THRESHOLD = 1000 * 3600 * 24;
export const LATEST_PUSH_REGISTRATION_KEY = 'latestPushRegistration';

export type PushSubscriptionPOJO = PushSubscriptionJSON;

/**
 * Tries to unsubscribe the PushSubscription of the current device, if existing.
 * This method should be used as a last resort to clean up a corrupted state, use
 * deletePushRegistration if possible.
 *
 * @returns true on success, false on any kind of failure
 */
const unsubscribeNativePushRegistration = async () => {
  try {
    const fullNativeSub = await navigator.serviceWorker.ready.then((sW) =>
      sW.pushManager.getSubscription()
    );
    if (!fullNativeSub) {
      console.log("Couldn't get full native PushSubscription while trying to unsubscribe it.");
    } else {
      const success = await fullNativeSub?.unsubscribe();
      if (success) {
        console.log('Unregistered (in FB) local native PushSubscription sucessfully unsubscribed.');
        currentNativeSubStore.set(null);
        return true;
      } else {
        console.warn(
          'Unregistered (in FB) local native PushSubscription was not sucessfully unsubscribed.'
        );
        // Then we just ignore this one...
      }
    }
    return false;
  } catch (e) {
    console.warn(
      'Error while trying to unsubscribe an unregistered (in FB) local native PushSubscription',
      e
    );
    Sentry.captureException(e);
  }
};

export const createPushRegistrationObserver = () => {
  const q = query(
    collection(
      db(),
      USERS_PRIVATE,
      getUser().id,
      PUSH_REGISTRATIONS
    ) as CollectionReference<FirebasePushRegistration>
  );

  return onSnapshot(q, async (querySnapshot) => {
    let syncedPushRegistrations = querySnapshot.docs.map((registration) => ({
      ...registration.data({
        // Note that adding a doc with serverTimestamp() will call this listener already, before the server sees it.
        //
        // > "By specifying 'estimate', pending server timestamps return an estimate based on the local clock.
        //    This estimate will differ from the final value and cause these values to change once the server result becomes available."
        // https://firebase.google.com/docs/reference/js/firestore_.snapshotoptions.md#snapshotoptions_interface
        serverTimestamps: 'estimate'
      }),
      id: registration.id
    }));

    const currentNativeSub = await getCurrentNativeSubscription();
    let cachedSub: SubscriptionCore | undefined;
    try {
      const latestPushRegistration = localStorage.getItem(LATEST_PUSH_REGISTRATION_KEY);
      if (latestPushRegistration) {
        cachedSub = JSON.parse(latestPushRegistration);
      }
    } catch (e) {
      console.warn('Corrupted cached subscription JSON data');
      Sentry.captureException(e);
    }

    if (currentNativeSub) {
      // If a current Firebase registration is known, linked to the current device
      const linkedFirebaseRegistration = syncedPushRegistrations.find(
        (registration) => registration.subscription.endpoint === currentNativeSub?.endpoint
      );
      if (!linkedFirebaseRegistration) {
        // This might mean a deletion has gone badly
        console.warn('Current native subscription was not saved in the Firestore');
        // Since this native push registration is now useless, let's try to unregister it
        trackEvent(PlausibleEvent.DELETED_PUSH_REGISTRATION, { type: 'detached' });
        await unsubscribeNativePushRegistration();
      }
      if (linkedFirebaseRegistration?.status === PushRegistrationStatus.MARKED_FOR_DELETION) {
        // Unsubscribe the current device's registration if it was marked for deletion.
        trackEvent(PlausibleEvent.DELETED_PUSH_REGISTRATION, { type: 'other' });
        await deletePushRegistration(linkedFirebaseRegistration);
        // Note: the deletePushRegistration method invokes onSnapshot again, hence we can skip a UI update of stale data.
        return;
      } else if (
        !!linkedFirebaseRegistration &&
        new Date().valueOf() -
          (linkedFirebaseRegistration.refreshedAt as Timestamp).toDate().valueOf() >
          // Weekly refresh of the ones that have not been active
          MESSAGING_REFRESH_THRESHOLD
      ) {
        trackEvent(PlausibleEvent.REFRESHED_PUSH_REGISTRATION);
        await refreshExistingSubscription(linkedFirebaseRegistration);
        // Note: the refreshExistingSubscription invokes onSnapshot again, hence we can skip a UI update of stale data.
        return;
      }
    }

    // Handle external deletion in the past, on the current device only
    if (
      // A cached sub exists
      cachedSub &&
      // and it is not equal to the current sub (which may also be null or undefined)
      cachedSub.subscription.endpoint !== currentNativeSub?.endpoint
    ) {
      const pushRegistrationDocToDelete = syncedPushRegistrations.find(
        (pR) => cachedSub?.subscription.endpoint === pR.subscription.endpoint
      );
      if (pushRegistrationDocToDelete) {
        // If the cached sub can still be found in the remote registrations,
        // this means a local unsubscribe happened without us being notified about it.
        // The subscription is invalid/unusable regardless of its status, it should be deleted.
        console.log('Deleted an invalidated cached pushRegistration');
        await deletePushRegistrationDoc(pushRegistrationDocToDelete);
        // Note: the above will invoke onSnapshot again, skip UI update.
        localStorage.removeItem(LATEST_PUSH_REGISTRATION_KEY);
        return;
      }
    }

    // Don't show push registrations that are marked for deletion
    syncedPushRegistrations = syncedPushRegistrations.filter(
      (pR) => pR.status !== PushRegistrationStatus.MARKED_FOR_DELETION
    );

    // Update UI
    pushRegistrations.set(syncedPushRegistrations);
    loadedPushRegistrations.set(true);
  });
};

/**
 * Push registrations collection reference
 */
const pushRegistrationsColRef = () =>
  collection(
    db(),
    USERS_PRIVATE,
    getUser().uid,
    PUSH_REGISTRATIONS
  ) as CollectionReference<FirebasePushRegistration>;

/**
 * Gets the current push subscription
 * @returns the browser's native PushSubscriptionJSON if one exists.
 *   - undefined or if the browser does not support Push Subscriptions
 *   - null if there is no current subscription, but push subscriptions are supported
 */
export const getCurrentNativeSubscription = async () => {
  if (!hasNotificationSupportNow()) {
    return undefined;
  }
  const sub = await navigator.serviceWorker.ready.then((serviceWorkerRegistration) =>
    getSubscriptionFromSW(serviceWorkerRegistration)
  );
  // Empirically: iOS Safari may give an empty object, instead of null, when no registration exists.
  if (isEmpty(sub)) {
    currentNativeSubStore.set(null);
    return null;
  }
  currentNativeSubStore.set(sub);
  return sub;
};

export const hasEnabledNotificationsOnCurrentDevice = () => {
  return !!get(currentNativeSubStore);
};

/**
 * Note: requires pushRegistrations to be loaded via the observer
 * Also considers push registratrations marked for deletion as "enabled".
 */
export const hasOrHadEnabledNotificationsSomewhere = () => {
  pushRegistrationLoadCheck();
  return get(pushRegistrations).length > 0;
};

/**
 * Find a subscription by its Web Push endpoint.
 */
export const findSubscriptionByEndpoint = (
  pushRegistrations: LocalPushRegistration[],
  endpoint: string
) => {
  pushRegistrationLoadCheck();
  return pushRegistrations.find((pR) => pR.subscription.endpoint === endpoint);
};

export const isAndroidFirefox = () =>
  uaInfo?.os.is('Android') && uaInfo?.browser.name?.includes('Firefox');

/** Convenience method. Whether we're _sure_ that this device can handle Web Push, now or with some intervention. */
export const isNotificationEligible = () =>
  (hasNotificationSupportNow() || canHaveNotificationSupport()) &&
  // We decided to _not_ allow notifications on Firefox on Android, because
  // - on a notification tap, Firefox may open a blank page or any last page from history
  // - PWA experience is "just a bookmark", not like Chrome
  // - unregistering doesn't work like in Chrome (PushSubscription stays active after programmatic unsub)
  !isAndroidFirefox();

// https://developer.mozilla.org/en-US/docs/Web/API/Notification/permission_static
export const hasDeniedNotifications = () =>
  hasNotificationSupportNow() && Notification.permission === 'denied';

/**
 * The caller should close any modals that this action affects.
 * @returns true on a sucessful (expected) result.
 */
export const handleNotificationEnableAttempt = async () => {
  if (!isMobileDevice) {
    window.open(get(t)('push-notifications.prompt.helpcenter-url'), '_blank');
    return true;
  } else if (hasNotificationSupportNow() && !isAndroidFirefox()) {
    // Actually try to enable notifications
    const success = await createPushRegistration();
    if (success) {
      return true;
    } else {
      // TODO: visible report error in modal?
      console.warn('There was an error in enabling notifications');
      return false;
    }
  } else if (canHaveNotificationSupport() || isAndroidFirefox()) {
    // TODO: set notification dismissal?
    rootModal.set(NotificationSetupGuideModal);
    return true;
  } else {
    // TODO: show some instructions here (for an unsupported device)?
    // Probably not, because those can be delegated to the account page.
    console.warn(
      'Tried to enable notifications on a non-supported iDevice, this action should not have been shown.'
    );
    return false;
  }
};

type SubscriptionCore = {
  fcmToken: string;
  subscription: PushSubscriptionJSON;
};

/**
 * In case of a new subscription, this method should be called from a user gesture.
 * It will try to ask for permission if none was granted, and throw an error if permissions was denied/blocked.
 * @returns
 */
const subscribeOrRefreshMessaging = async () => {
  if (!hasNotificationSupportNow()) {
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
  const subscriptionObject = await getSubscriptionFromSW(serviceWorkerRegistration);
  currentNativeSubStore.set(subscriptionObject);
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

export const getDeviceUAWithClientHints = async () => {
  const uaP = new UAParser();
  const deviceWithClientHints = await uaP.getDevice().withFeatureCheck().withClientHints();
  if (deviceWithClientHints.model === 'K') {
    deviceWithClientHints.model = 'Android';
  }
  return deviceWithClientHints;
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
export const createPushRegistration = async () => {
  /**
   * Shows an error in a modal with the given description. Also includes user agent information.
   * @param error
   * @param specifier HTML string
   */
  const handleErrorGeneric = (error: unknown, specifier: string) => {
    rootModal.set(
      bind(ErrorModal, {
        error,
        specifier
      })
    );
    isEnablingLocalPushRegistration.set(false);
  };

  /**
   * Displays a general-purpose error message related to notifications, with optional extra info.
   * @param error
   * @param extraInfo
   */
  const handleError = (error: unknown, extraInfo?: string) => {
    const errorModalSpecifier = get(t)('push-notifications.error.generic', {
      values: {
        emailLink: emailAsLink
      }
    });
    handleErrorGeneric(error, `${errorModalSpecifier}${extraInfo ? `<br><br>${extraInfo}` : ''}`);
  };

  // Start loading state indicator
  isEnablingLocalPushRegistration.set(true);

  let subscriptionCore: SubscriptionCore;

  // Try to enable the notifications
  try {
    const subscriptionPromise = subscribeOrRefreshMessaging();
    subscriptionCore = await timeout(
      subscriptionPromise,
      15 * 1000,
      'Registering web push timed out'
    );
  } catch (e) {
    console.error(e);
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
    console.warn('Tried to add an already-known push registration; this should not happen.');
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
    console.error(msg);
    Sentry.captureException(e);
    return;
  }
};

/**
 * Assumes an existing subscription exists locally.
 * Remote Firestore info is linked to local (FCM) push registration by cross-referencing the subscription.endpoint URL
 */
const refreshExistingSubscription = async (registration: LocalPushRegistration) => {
  // Refresh the FCM token, get latest native subscription (should be unchanged)
  const { fcmToken, subscription } = await subscribeOrRefreshMessaging();
  await updateDoc(
    doc(db(), `${pushRegistrationsColRef().path}/${registration.id}`) as DocumentReference<
      FirebasePushRegistration,
      FirebasePushRegistration
    >,
    {
      // Update the refresh timestamp
      refreshedAt: serverTimestamp(),
      // These two should not have changed in happy path cases, but it is possible they can.
      // https://firebase.google.com/docs/cloud-messaging/manage-tokens#stale-and-expired-tokens
      // > However, FCM issues a new token for the app instance in the rare case that the device connects again and the app is opened.
      // NOTE: I'm not sure if the endpoint will in that case be the same, and if we tie both "PushRegistrations" from the same device
      // (one stale and one not) to eachother.
      //
      fcmToken,
      subscription: { ...subscription },
      // In case we are able to refresh a registration, we should be able to assume that this registration is still active, or active _again_
      // after erroring. NOTE: not tested.
      // In other cases (deleted here or on another device), this method should not have been called.
      status: PushRegistrationStatus.ACTIVE
    }
  );
  trackEvent(PlausibleEvent.REFRESHED_PUSH_REGISTRATION);
};

const _pushRegistrationDocRef = (id: string) =>
  doc(
    db(),
    USERS_PRIVATE,
    getUser().uid,
    PUSH_REGISTRATIONS,
    id
  ) as DocumentReference<FirebasePushRegistration>;

export const deletePushRegistrationDoc = async ({ id }: LocalPushRegistration) => {
  const docRef = _pushRegistrationDocRef(id);
  return await deleteDoc(docRef);
};

/**
 * Deletes the given push registration, or marks it for deletion if the current device can not delete it.
 * Calling this method again on the proper device afterwards will complete the deletion.
 *
 * @returns whether the operation was successful.
 */
export const deletePushRegistration = async (pushRegistration: LocalPushRegistration) => {
  const {
    id,
    ua: {
      device: { vendor, model },
      browser
    },
    subscription: { endpoint: endpointToDelete }
  } = pushRegistration;

  let currentNativeSub: PushSubscriptionPOJO | undefined | null;
  if (hasNotificationSupportNow()) {
    currentNativeSub = await getCurrentNativeSubscription();
  }

  if (currentNativeSub && currentNativeSub.endpoint === endpointToDelete) {
    // We are currently in the browser/host that we want to delete
    //
    // This will handle:
    // - the purge of the FCM token from Firebase Messaging's internal IDB
    // - the deletion of the token from FCM's backend (maybe, might be bugged)
    // - the pushManager.unsubscribe() of the Web Push API
    //
    // TODO: this can fail because /firebase-messaging-sw.js isn't used?
    //  (it tries to unregister that unused SW)
    //  In that case, does it fail after having deleted all other relevant parts?
    //  We could delete the doc in any case, also in case of failure.
    trackEvent(PlausibleEvent.DELETED_PUSH_REGISTRATION, {
      type: 'own'
    });

    return deleteToken(messaging())
      .then(async (success) => {
        if (success) {
          try {
            console.log('Successfully deleted/unsubscribed the current FCM registration.');
            currentNativeSubStore.set(null);
            await deletePushRegistrationDoc(pushRegistration);
            return true;
          } catch (e) {
            console.error(e);
            Sentry.captureException(e);
            return false;
          }
        } else {
          console.warn('Failed to delete the FCM token that was marked to be deleted.');
          return false;
        }
      })
      .catch((e) => {
        console.error(e);
        return false;
      });
  } else {
    // We are currently NOT in a browser that can handle the deletion/unsubscription of the registration
    // We simply mark it for deletion (so that the backend won't use it anymore).
    console.log(
      `Marking the subscription with ID ${id} on ${browser} ${vendor} ${model} for deletion.`
    );

    await updateDoc(_pushRegistrationDocRef(id), {
      status: PushRegistrationStatus.MARKED_FOR_DELETION
    });
    return true;
  }
};

/**
 * @returns a PushRegistrationJSON object if one exists, null if none exists
 */
async function getSubscriptionFromSW(serviceWorkerRegistration: ServiceWorkerRegistration) {
  return await serviceWorkerRegistration.pushManager
    .getSubscription()
    .then((s) => s?.toJSON() || null);
}

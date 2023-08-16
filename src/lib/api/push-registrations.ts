import { deleteToken, getToken } from 'firebase/messaging';
import { db, messaging } from './firebase';
import {
  CollectionReference,
  DocumentReference,
  Timestamp,
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
import { UAParser } from 'ua-parser-js';
import { pushRegistrations } from '$lib/stores/pushRegistrations';
import removeUndefined from '$lib/util/remove-undefined';
import { get } from 'svelte/store';
import isFirebaseError from '$lib/util/types/isFirebaseError';

/** One week in ms */
const MESSAGING_REFRESH_THRESHOLD = 1000 * 3600 * 24 * 7;
export const LATEST_PUSH_REGISTRATION_KEY = 'latestPushRegistration';

export type PushSubscriptionPOJO = PushSubscriptionJSON;

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
        // "By specifying 'estimate', pending server timestamps return an estimate based on the local clock.
        // This estimate will differ from the final value and cause these values to change once the server result becomes available."
        // https://firebase.google.com/docs/reference/js/firestore_.snapshotoptions.md#snapshotoptions_interface
        serverTimestamps: 'estimate'
      }),
      id: registration.id
    }));

    const currentSub = await getCurrentSubscription();
    let cachedSub: SubscriptionCore | undefined;
    try {
      const latestPushRegistration = localStorage.getItem(LATEST_PUSH_REGISTRATION_KEY);
      if (latestPushRegistration) {
        cachedSub = JSON.parse(latestPushRegistration);
      }
    } catch (e) {
      console.warn('Corrupted cached subscription JSON data');
    }

    if (currentSub) {
      // If a current subscription is known
      const currentRegistration = syncedPushRegistrations.find(
        (registration) => registration.subscription.endpoint === currentSub?.endpoint
      );
      if (!currentRegistration) {
        throw new Error('Current subscription was not saved in the Firestore');
      }
      if (currentRegistration?.status === PushRegistrationStatus.MARKED_FOR_DELETION) {
        // Unsubscribe the current device's registration if it was marked for deletion.
        await deletePushRegistration(currentRegistration);
        // Note: the deletePushRegistration method invokes onSnapshot again, hence we can skip a UI update of stale data.
        return;
      } else if (
        new Date().valueOf() - (currentRegistration.refreshedAt as Timestamp).toDate().valueOf() >
        // Weekly refresh of the ones that have not been active
        MESSAGING_REFRESH_THRESHOLD
      ) {
        await refreshExistingSubscription(currentRegistration);
        // Note: the refreshExistingSubscription invokes onSnapshot again, hence we can skip a UI update of stale data.
        return;
      }
    }

    if (
      // A cached sub exists
      cachedSub &&
      // and it is not equal to the current sub (which may be null or undefined)
      cachedSub.subscription.endpoint !== currentSub?.endpoint
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
 * @returns {undefined} if there is no current subscription, or if the browser does not support Push Subscriptions
 */
export const getCurrentSubscription = async () => {
  if (!hasNotificationSupport()) {
    return undefined;
  }
  return navigator.serviceWorker.ready.then((serviceWorkerRegistration) =>
    getSubscriptionFromSW(serviceWorkerRegistration)
  );
};

/**
 * Find a subscription by its Web Push endpoint.
 */
export const findSubscriptionByEndpoint = (
  pushRegistrations: LocalPushRegistration[],
  endpoint: string
) => {
  return pushRegistrations.find((pR) => pR.subscription.endpoint === endpoint);
};

/**
 * Synchronous (and probably more limited) version of Firebase Messaging's isSupported function
 */
export const hasNotificationSupport = () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support the Notification API.');
    return false;
  } else if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('This browser does not support service workers.');
    return false;
  }
  return true;
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
const subscribeOrRefreshMessaging = () =>
  new Promise<SubscriptionCore>((resolve, reject) => {
    // TODO: the UI should prevent these calls if they can be prevented
    //
    if (!hasNotificationSupport()) {
      throw new Error('Tried to register push subscription without notification support');
    } else {
      navigator.serviceWorker.ready.then((serviceWorkerRegistration) => {
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

        getToken(messaging(), {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY,
          serviceWorkerRegistration: serviceWorkerRegistration
        })
          .then(async (currentToken) => {
            if (!currentToken) {
              reject(
                'No FCM token was received in a subscribe/refresh operation. This should not happen.'
              );
              return;
            }
            // Handle a current registration token (obtained earlier with the Notification.requestPermissions API)
            //
            // We also store the native underlying subscription object, so we might leverage it later.
            // We use the endpoint to uniquely identify a subscription, because we can check its status without side-effects, unlike
            // Messaging's getToken() (see above)
            // Endpoints should uniquely identify a subscription.
            // https://stackoverflow.com/questions/63767889/is-it-safe-to-use-the-p256dh-or-endpoint-keys-values-of-the-push-notificatio/63769192#63769192
            const subscriptionObject = await getSubscriptionFromSW(serviceWorkerRegistration);
            if (!subscriptionObject) {
              reject(
                'Could unexpectedly not retrieve the native Push Subscription object of an existing FCM registration'
              );
              return;
            }
            const subscriptionInfo = {
              fcmToken: currentToken,
              subscription: subscriptionObject
            };

            // Cache the current subscription
            localStorage.setItem(LATEST_PUSH_REGISTRATION_KEY, JSON.stringify(subscriptionInfo));

            resolve(subscriptionInfo);
          })
          .catch(reject);
      });
    }
  });

/**
 * Creates, and subscribes to, a new push registration.
 * Affects three systems:
 * 1. the native Web Push/Service Worker/browser APIs & subscription objects
 * 2. the Firebase Cloud Messaging backend (kept in sync by messaging() & our SW)
 * 3. our own PushRegistration registry in Firestore
 */
export const createPushRegistration = async () => {
  let subscriptionCore: SubscriptionCore;
  try {
    subscriptionCore = await subscribeOrRefreshMessaging();
  } catch (e) {
    console.error(e);
    if (isFirebaseError(e) && e.code === 'messaging/permission-blocked') {
      // The user has disabled/blocked permission before, and they tried to enable notifications again now
      // TODO: Inform the user that they should allow permissions via their browser, or "Reset permissions" (Chrome)
    }
    return;
  }
  const { fcmToken, subscription } = subscriptionCore;

  // If this push registration was already stored, do not add it again.
  if (get(pushRegistrations).find((pR) => pR.fcmToken === fcmToken)) {
    console.warn('Tried to add an already-known push registration; this should not happen.');
    return;
  }

  // Add the registration to the Firestore
  const { os, browser, device } = UAParser(navigator.userAgent);
  await addDoc(pushRegistrationsColRef(), {
    status: PushRegistrationStatus.ACTIVE,
    fcmToken,
    subscription,
    ua: removeUndefined({
      os: os.name,
      browser: browser.name,
      // Destructure helps to convert into POJO
      device: removeUndefined({ ...device })
    }),
    host: location.host,
    createdAt: serverTimestamp(),
    refreshedAt: serverTimestamp()
  });
};

/** Assumes an existing subscription exists locally. */
const refreshExistingSubscription = async (registration: LocalPushRegistration) => {
  // Refresh the FCM token, get latest native subscription (should be unchanged)
  const { fcmToken, subscription } = await subscribeOrRefreshMessaging();
  await updateDoc(
    doc(
      db(),
      `${pushRegistrationsColRef().path}/${registration.id}`
    ) as DocumentReference<FirebasePushRegistration>,
    {
      // Update the refresh timestamp
      refreshedAt: serverTimestamp(),
      // These two should not have changed, but maybe they can!
      fcmToken,
      subscription: { ...subscription }
    }
  );
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

  let currentSub: PushSubscriptionPOJO | undefined;
  if (hasNotificationSupport()) {
    currentSub = await getCurrentSubscription();
  }

  if (currentSub && currentSub.endpoint === endpointToDelete) {
    // We are currently in the browser/host that we want to delete
    //
    // This will handle:
    // - the purge of the FCM token from Firebase Messaging's internal IDB
    // - the deletion of the token from FCM's backend (maybe, might be bugged)
    // - the pushManager.unsubscribe() of the Web Push API
    return deleteToken(messaging())
      .then(async (success) => {
        if (success) {
          try {
            console.log('Successfully deleted/unsubscribed the current FCM registration.');
            await deletePushRegistrationDoc(pushRegistration);
            return true;
          } catch (e) {
            console.error(e);
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

async function getSubscriptionFromSW(serviceWorkerRegistration: ServiceWorkerRegistration) {
  return await serviceWorkerRegistration.pushManager.getSubscription().then((s) => s?.toJSON());
}

import { getToken } from 'firebase/messaging';
import { db, messaging } from './firebase';
import {
  CollectionReference,
  DocumentReference,
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp
} from 'firebase/firestore';
import { PUSH_REGISTRATIONS, USERS_PRIVATE } from './collections';
import { getUser } from '$lib/stores/auth';
import type { FirebasePushRegistration } from '$lib/types/PushRegistration';
import { UAParser } from 'ua-parser-js';
import { pushRegistrations } from '$lib/stores/pushRegistrations';
import removeUndefined from '$lib/util/remove-undefined';

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
    const subscriptions = querySnapshot.docs.map((ss) => ({ ...ss.data(), id: ss.id }));
    pushRegistrations.set(subscriptions);
    const currentSub = await getCurrentSubscription();
    // If we locally have a subscription that isn't available remotely, then add it.
    // This normally shouldn't happen, except when a database was wiped (in testing)
    // TODO: this might be counter intuitive: we need to be able to revoke the permission
    // when a sub was marked for deletion (elsewhere)! Can we?
    // yes! https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription/unsubscribe
    // maybe with a status field?
    if (
      currentSub &&
      !subscriptions.find((pR) => pR.subscription.endpoint === currentSub.endpoint)
    ) {
      createPushRegistration();
    }
  });
};

export const getCurrentSubscription = async () =>
  navigator.serviceWorker.ready.then((serviceWorkerRegistration) =>
    getSubscriptionFromSW(serviceWorkerRegistration)
  );

/**
 * Note: this should only be called from a user gesture on iOS
 */
const subscribeToWebPush = () => {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((serviceWorkerRegistration) => {
      // This probably does the native Web Push `serviceWorkerRegistration.pushManager.subscribe(options)` internally somewhere, to get the Subscription info
      // It then converts it to a FCM registration to identify this browser
      // Safari expects the options: { userVisibleOnly: true } to be set, the FCM implementation seems to do this.
      //
      // TODO: "If a notification permission isn't already granted, this method asks the user for permission." - so that code can be removed
      getToken(messaging(), {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY,
        serviceWorkerRegistration: serviceWorkerRegistration
      })
        .then(async (currentToken) => {
          if (currentToken) {
            // Handle a current registration token (obtained earlier with the Notification.requestPermissions API)
            //
            // TODO: i'm not really sure where this token comes from. FB? the SW?
            // I guess it identifies this browser, and can be stored
            // We will also store the native subscription object, so we might leverage it later.
            const subscriptionObject = await getSubscriptionFromSW(serviceWorkerRegistration);

            if (!subscriptionObject) {
              // This should, I suppose, not happen
              console.error(
                'Could not retrieve subscription object, even though a FCM token is available.'
              );
              return;
            }

            const colRef = collection(
              db(),
              USERS_PRIVATE,
              getUser().uid,
              PUSH_REGISTRATIONS
            ) as CollectionReference<FirebasePushRegistration>;

            // TODO: search for existing docs with same token?
            //
            const { os, browser, device } = UAParser(navigator.userAgent);
            await addDoc(colRef, {
              fcmToken: currentToken,
              subscription: subscriptionObject,
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
          } else {
            // Show permission request UI
            // NOTE: I guess this means
            console.log('No registration token available. Request permission to generate one.');
          }
        })
        .catch((err) => {
          console.error('An error occurred while retrieving a token. ', err);
        });
    });
  }
};

export const createPushRegistration = () => {
  console.log('Requesting permission');
  if (!('Notification' in window)) {
    alert('This browser does not support notifications');
    return;
  }
  if (Notification.permission === 'granted') {
    subscribeToWebPush();
  } else {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        subscribeToWebPush();
      }
    });
  }
};

export const deletePushRegistration = async (id: string) => {
  const docRef = doc(
    db(),
    USERS_PRIVATE,
    getUser().uid,
    PUSH_REGISTRATIONS,
    id
  ) as DocumentReference<FirebasePushRegistration>;
  await deleteDoc(docRef);
};

async function getSubscriptionFromSW(serviceWorkerRegistration: ServiceWorkerRegistration) {
  return await serviceWorkerRegistration.pushManager.getSubscription().then((s) => s?.toJSON());
}

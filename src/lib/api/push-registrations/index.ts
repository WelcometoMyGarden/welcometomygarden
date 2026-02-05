import { deleteToken } from 'firebase/messaging';
import { db, messaging } from '../firebase';
import {
  type CollectionReference,
  type DocumentReference,
  type Timestamp,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { PUSH_REGISTRATIONS, USERS_PRIVATE } from '../collections';
import { getUser } from '$lib/stores/auth';
import {
  PushRegistrationStatus,
  type FirebasePushRegistration,
  type LocalPushRegistration,
  type PushSubscriptionPOJO,
  type WebPushSubscriptionCore
} from '$lib/types/PushRegistration';
import {
  currentWebPushSubStore,
  deviceId,
  loadedPushRegistrations,
  pushRegistrations
} from '$lib/stores/pushRegistrations';
import { get } from 'svelte/store';
import { isMobileDevice, isNative } from '$lib/util/uaInfo';
import { t } from 'svelte-i18n';
import { rootModal } from '$lib/stores/app';
import NotificationSetupGuideModal from '$lib/components/Notifications/NotificationSetupGuideModal.svelte';
import { trackEvent } from '$lib/util';
import { PlausibleEvent } from '$lib/types/Plausible';
import {
  canHaveWebPushSupport,
  hasWebPushNotificationSupportNow,
  isAndroidFirefox,
  isNativePushRegistration,
  isWebPushRegistration,
  pushRegistrationDocRef,
  pushRegistrationsColRef
} from '$lib/util/push-registrations';
import {
  createNativePushRegistration,
  registerOrRefreshNativeRegistration,
  unregisterNotifications
} from './native';
import {
  createWebPushRegistration,
  getCurrentWebPushSubscription,
  LATEST_PUSH_REGISTRATION_KEY,
  subscribeOrRefreshWebFCM,
  unsubscribeWebPushRegistration
} from './webpush';
import logger from '$lib/util/logger';
import * as Sentry from '@sentry/sveltekit';

const pushRegistrationLoadCheck = () => {
  if (!get(loadedPushRegistrations)) {
    logger.warn(
      "Trying to interact with push registrations that haven't loaded yet! This could lead to inconsistencies."
    );
  }
};

/**
 * Assumes an existing subscription exists locally. Works with native or web push.
 */
const refreshExistingSubscription = async (registration: LocalPushRegistration) => {
  let fcmToken;
  let subscription;
  if (isWebPushRegistration(registration)) {
    // Refresh the FCM token, get latest native subscription (should be unchanged)
    ({ fcmToken, subscription } = await subscribeOrRefreshWebFCM());
  } else {
    fcmToken = await registerOrRefreshNativeRegistration();
  }
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
      subscription: subscription ? { ...subscription } : null,
      deviceId: get(deviceId) ?? null,
      // In case we are able to refresh a registration, we should be able to assume that this registration is still active, or active _again_
      // after erroring. NOTE: not tested.
      // In other cases (deleted here or on another device), this method should not have been called.
      status: PushRegistrationStatus.ACTIVE
    }
  );
  trackEvent(PlausibleEvent.REFRESHED_PUSH_REGISTRATION);
};

/** One day in ms */
const MESSAGING_REFRESH_THRESHOLD = 1000 * 3600 * 24;

export const createFirebasePushRegistrationObserver = () => {
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

    const currentWebPushSub = await getCurrentWebPushSubscription();
    let cachedWebPushSub: WebPushSubscriptionCore | undefined;
    try {
      const latestPushRegistration = localStorage.getItem(LATEST_PUSH_REGISTRATION_KEY);
      if (latestPushRegistration) {
        cachedWebPushSub = JSON.parse(latestPushRegistration);
      }
    } catch (e) {
      logger.warn('Corrupted cached subscription JSON data');
      Sentry.captureException(e);
    }

    if (currentWebPushSub || isNative) {
      // If a current web push Firebase registration is known, linked to the current device
      const linkedFirebaseRegistration = syncedPushRegistrations.find((registration) =>
        isWebPushRegistration(registration)
          ? registration.subscription?.endpoint === currentWebPushSub?.endpoint
          : registration.deviceId === get(deviceId)
      );
      if (currentWebPushSub && !linkedFirebaseRegistration) {
        // This might mean a web push deletion has gone badly
        logger.warn('Current local web push subscription was not saved in the Firestore');
        // Since this native push registration is now useless, let's try to unregister it
        trackEvent(PlausibleEvent.DELETED_PUSH_REGISTRATION, { type: 'detached' });
        await unsubscribeWebPushRegistration();
      }
      if (linkedFirebaseRegistration?.status === PushRegistrationStatus.MARKED_FOR_DELETION) {
        // Unsubscribe the current device's registration if it was marked for deletion, in any case
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

    // Handle external deletion in the past, on the current web push device only
    if (
      // A cached sub exists
      cachedWebPushSub &&
      // and it is not equal to the current sub (which may also be null or undefined)
      cachedWebPushSub.subscription.endpoint !== currentWebPushSub?.endpoint
    ) {
      const pushRegistrationDocToDelete = syncedPushRegistrations.find(
        (pR) =>
          isWebPushRegistration(pR) &&
          cachedWebPushSub?.subscription.endpoint === pR.subscription.endpoint
      );
      if (pushRegistrationDocToDelete) {
        // If the cached sub can still be found in the remote registrations,
        // this means a local unsubscribe happened without us being notified about it.
        // The subscription is invalid/unusable regardless of its status, it should be deleted.
        logger.log('Deleted an invalidated cached pushRegistration');
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

export const hasEnabledNotificationsOnCurrentDevice = () => {
  return (
    !!get(currentWebPushSubStore) ||
    (isNative &&
      get(pushRegistrations).find(
        (r) =>
          isNativePushRegistration(r) &&
          r.deviceId === get(deviceId) &&
          r.status === PushRegistrationStatus.ACTIVE
      ))
  );
};

/**
 * Note: requires pushRegistrations to be loaded via the observer
 * Also considers push registratrations marked for deletion as "enabled".
 */
export const hasOrHadEnabledNotificationsSomewhere = () => {
  pushRegistrationLoadCheck();
  return get(pushRegistrations).length > 0;
};

/** Convenience method. Whether we're _sure_ that this device can handle Web Push or native push notifications, now or with some intervention. */
export const isNotificationEligible = () =>
  isNative ||
  ((hasWebPushNotificationSupportNow() || canHaveWebPushSupport()) &&
    // We decided to _not_ allow notifications on Firefox on Android, because
    // - on a notification tap, Firefox may open a blank page or any last page from history
    // - PWA experience is "just a bookmark", not like Chrome
    // - unregistering doesn't work like in Chrome (PushSubscription stays active after programmatic unsub)
    !isAndroidFirefox());

/**
 * The caller should close any modals that this action affects.
 * @returns true on a sucessful (expected) result.
 */
export const handleNotificationEnableAttempt = async () => {
  if (!isMobileDevice) {
    window.open(get(t)('push-notifications.prompt.helpcenter-url'), '_blank');
    return true;
  } else if (isNative || (hasWebPushNotificationSupportNow() && !isAndroidFirefox())) {
    // Actually try to enable the notifications
    const success = await (isNative ? createNativePushRegistration() : createWebPushRegistration());
    if (success) {
      return true;
    } else {
      // TODO: visible report error in modal?
      logger.warn('There was an error in enabling notifications');
      return false;
    }
  } else if (canHaveWebPushSupport() || isAndroidFirefox()) {
    // TODO: set notification dismissal?
    rootModal.set(NotificationSetupGuideModal);
    return true;
  } else {
    // TODO: show some instructions here (for an unsupported device)?
    // Probably not, because those can be delegated to the account page.
    logger.warn(
      'Tried to enable notifications on a non-supported iDevice, this action should not have been shown.'
    );
    return false;
  }
};

export const deletePushRegistrationDoc = async ({ id }: LocalPushRegistration) => {
  const docRef = pushRegistrationDocRef(id);
  return await deleteDoc(docRef);
};

const markForDeletion = async (localPushRegistration: LocalPushRegistration): Promise<boolean> => {
  const {
    id,
    ua: {
      device: { vendor, model },
      browser
    }
  } = localPushRegistration;
  logger.log(
    `Marking the ${isNativePushRegistration(localPushRegistration) ? 'native' : 'web'} subscription with ID ${id} on ${browser} ${vendor} ${model} for deletion.`
  );
  try {
    await updateDoc(pushRegistrationDocRef(id), {
      status: PushRegistrationStatus.MARKED_FOR_DELETION
    });
  } catch (e) {
    return false;
  }
  return true;
};

/**
 * Deletes the given push registration, or marks it for deletion if the current device can not delete it.
 * Calling this method again on the proper device afterwards will complete the deletion.
 *
 * @returns whether the operation was successful.
 */
export const deletePushRegistration = async (pushRegistration: LocalPushRegistration) => {
  if (isWebPushRegistration(pushRegistration)) {
    const { endpoint: endpointToDelete } = pushRegistration.subscription;
    let currentNativeSub: PushSubscriptionPOJO | undefined | null;
    if (hasWebPushNotificationSupportNow()) {
      currentNativeSub = await getCurrentWebPushSubscription();
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
              logger.log('Successfully deleted/unsubscribed the current web FCM registration.');
              currentWebPushSubStore.set(null);
              await deletePushRegistrationDoc(pushRegistration);
              return true;
            } catch (e) {
              logger.error(e);
              Sentry.captureException(e);
              return false;
            }
          } else {
            logger.warn('Failed to delete the FCM token that was marked to be deleted.');
            return false;
          }
        })
        .catch((e) => {
          logger.error(e);
          return false;
        });
    }
    // Otherwise, we have web push support, but we're not on the current device
    return await markForDeletion(pushRegistration);
  } else if (isNativePushRegistration(pushRegistration)) {
    // Check if we are on the same device
    if (!isNative) {
      return await markForDeletion(pushRegistration);
    }
    const nativeDeviceId = get(deviceId);
    if (!nativeDeviceId) {
      logger.warn(`Device unexpectedly not loaded yet or null ${nativeDeviceId}`);
      return false;
    }
    if (nativeDeviceId !== pushRegistration.deviceId) {
      logger.log('Marking a push registration inactive from another device');
    } else {
      return await unregisterNotifications().then(async (success) => {
        if (success) {
          try {
            logger.log('Successfully deleted/unsubscribed the current native FCM registration.');
            currentWebPushSubStore.set(null);
            await deletePushRegistrationDoc(pushRegistration);
            return true;
          } catch (e) {
            logger.error(e);
            Sentry.captureException(e);
            return false;
          }
        } else {
          logger.warn('Failed to delete the FCM token that was marked to be deleted.');
          return false;
        }
      });
    }
  } else {
    // We are currently NOT in a browser that can handle the deletion/unsubscription of the registration
    // We simply mark it for deletion (so that the backend won't use it anymore).
    return await markForDeletion(pushRegistration);
  }
};

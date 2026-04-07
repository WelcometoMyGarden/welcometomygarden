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
import { isIDevice, isMobileWebDevice, isNative } from '$lib/util/uaInfo';
import { trackEvent } from '$lib/util';
import { PlausibleEvent } from '$lib/types/Plausible';
import {
  hasWebPushNotificationSupportNow,
  isNativePushRegistration,
  isWebPushRegistration,
  pushRegistrationDocRef,
  pushRegistrationsColRef
} from '$lib/util/push-registrations';
import {
  createNativePushRegistration,
  registerOrRefreshNativeRegistration,
  resolveOnNativePushTokenLoaded
} from './native';
import {
  getCurrentWebPushSubscription,
  LATEST_PUSH_REGISTRATION_KEY,
  subscribeOrRefreshWebFCM,
  unsubscribeWebPushRegistration
} from './webpush';
import logger from '$lib/util/logger';
import * as Sentry from '@sentry/sveltekit';
import { PushNotifications } from '@capacitor/push-notifications';
import { appleAppStoreUrl, googlePlayStoreUrl } from '$lib/util/translation-helpers';

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

    logger.debug(
      `Processing push-registrations snapshot with ${syncedPushRegistrations.length} entries`
    );

    const currentWebPushSub = await getCurrentWebPushSubscription();
    let cachedWebPushSub: WebPushSubscriptionCore | undefined;
    try {
      const latestWebPushRegistration = localStorage.getItem(LATEST_PUSH_REGISTRATION_KEY);
      if (latestWebPushRegistration) {
        cachedWebPushSub = JSON.parse(latestWebPushRegistration);
      }
    } catch (e) {
      logger.warn('Corrupted cached subscription JSON data');
      Sentry.captureException(e);
    }

    let localNativePushToken;
    if (currentWebPushSub || isNative) {
      if (isNative) {
        // Before further processing, wait until we know the same token
        // Note: this token should be loaded whenver the app opens, even if there is
        // no push permission. See initializeNativePush()
        localNativePushToken = await resolveOnNativePushTokenLoaded();
      }

      // If a current web push Firebase registration is known, linked to the current device
      const linkedFirebaseRegistration = syncedPushRegistrations.find((registration) =>
        isWebPushRegistration(registration)
          ? registration.subscription?.endpoint === currentWebPushSub?.endpoint
          : registration.deviceId === get(deviceId)
      );
      const msSinceLastRefresh = linkedFirebaseRegistration
        ? new Date().valueOf() -
          (linkedFirebaseRegistration.refreshedAt as Timestamp).toDate().valueOf()
        : null;
      if (currentWebPushSub && !linkedFirebaseRegistration) {
        // This might mean a web push deletion has gone badly
        logger.warn('Current local web push subscription was not saved in the Firestore');
        // Since this native push registration is now useless, let's try to unregister it
        trackEvent(PlausibleEvent.DELETED_PUSH_REGISTRATION, { type: 'detached' });
        await unsubscribeWebPushRegistration();
      }
      let currentNativePermission: string | null = null;
      if (isNative && linkedFirebaseRegistration) {
        currentNativePermission = await PushNotifications.checkPermissions()
          .then(({ receive }) => receive)
          .catch((e) => {
            logger.warn(
              'Error while checking native permission while processing a push registration snapshot',
              e instanceof Error ? e.message : ''
            );
            return 'denied';
          });
      }
      if (linkedFirebaseRegistration?.status === PushRegistrationStatus.MARKED_FOR_DELETION) {
        // Unsubscribe the current device's registration if it was marked for deletion externally, in any case
        trackEvent(PlausibleEvent.DELETED_PUSH_REGISTRATION, { type: 'other' });
        await deletePushRegistration(linkedFirebaseRegistration);
        // Note: the deletePushRegistration method invokes onSnapshot again, hence we can skip a UI update of stale data.
        return;
      } else if (
        isNative &&
        linkedFirebaseRegistration &&
        (currentNativePermission !== 'granted' ||
          localNativePushToken !== linkedFirebaseRegistration.fcmToken)
      ) {
        // Between app opens, it looks like the notification permission was removed, or the token got "disconnected"
        // Delete the old registration.
        // Both these may happen after an app reinstall on Android (tested in emulators)
        // On iOS, the device ID changes after a reinstall (on a simulator at least).
        DEV: logger.debug(
          `Deleting a push registration linked to the current native device because push permission was not granted, or the FCM token diverged from the current device\n` +
            `Permission status: ${currentNativePermission}\nDeleting FCM Token: ${linkedFirebaseRegistration.fcmToken}`
        );
        trackEvent(PlausibleEvent.DELETED_PUSH_REGISTRATION, { type: 'permission_denied' });
        await deletePushRegistration(linkedFirebaseRegistration);
        // Note: the deletion should re-rigger a snapshot run.
        return;
      } else if (
        !!linkedFirebaseRegistration &&
        msSinceLastRefresh != null &&
        msSinceLastRefresh >
          // Daily refresh of the ones that have not been active
          MESSAGING_REFRESH_THRESHOLD
      ) {
        // Note: this will also try to update/refresh registrations with FCM_ERRORED status after 1 day
        // and make them active. I've observed this to be an issue (a wrongly errored token that actually worked)
        // on my own iPhone.
        DEV: logger.debug(
          `Refreshing the locally linked push registration after ${(msSinceLastRefresh / (1000 * 3600)).toFixed(1)} hours`
        );
        trackEvent(PlausibleEvent.REFRESHED_PUSH_REGISTRATION);
        await refreshExistingSubscription(linkedFirebaseRegistration);
        // Note: the refreshExistingSubscription call invokes onSnapshot again, hence we can skip a UI update of stale data.
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

    // Update UI
    pushRegistrations.set(syncedPushRegistrations);
    logger.debug('Loaded push registrations');
    loadedPushRegistrations.set(true);
  });
};

export const hasEnabledNotificationsOnCurrentDevice = async () => {
  if (isNative) {
    // We also check for whether the permissions are granted, because after an app
    // reinstall on the same device, it's possible that the permission status is "prompt"
    // while we have stored an "active" push registration linked to the same device
    //
    // TODO: we could and probably should also check for the local native FCM token, but then we have to wait
    // for it. Otherwise, if someone reinstalls, grants notif permission manually before opening the app,
    // then this would assume that the local device match + granted = enabled (not true: it will have a different FCM token)
    // Might also not be true on old androids with auto-grant.
    const { receive: permissionStatus } = await PushNotifications.checkPermissions();
    return (
      permissionStatus === 'granted' &&
      get(pushRegistrations).find(
        (r) =>
          isNativePushRegistration(r) &&
          r.deviceId === get(deviceId) &&
          r.status === PushRegistrationStatus.ACTIVE
      )
    );
  }
  return !!get(currentWebPushSubStore);
};

/**
 * Note: requires pushRegistrations to be loaded via the observer
 * Also considers push registratrations marked for deletion as "enabled".
 */
export const hasOrHadEnabledNotificationsSomewhere = () => {
  pushRegistrationLoadCheck();
  return get(pushRegistrations).length > 0;
};

export const hasOrHadEnabledNativeNotificationsSomewhere = () => {
  pushRegistrationLoadCheck();
  // TODO: should we await this somehow where it's used?
  return get(pushRegistrations).filter(isNativePushRegistration).length > 0;
};

/**
 * The caller should close any modals that this action affects.
 * @returns true on a sucessful (expected) result.
 */
export const handleNotificationEnableAttempt = async (showModalWhenDenied = true) => {
  logger.debug('Attempting to register notifications');
  // Note: desktop devices (not mobile web, not native) should normally not reach here
  if (isMobileWebDevice) {
    window.open(isIDevice() ? get(appleAppStoreUrl) : get(googlePlayStoreUrl), '_blank');
    return true;
  } else if (isNative) {
    // We're on native - actually try to enable the notifications
    const success = await createNativePushRegistration(showModalWhenDenied);
    if (success) {
      return true;
    } else {
      // TODO: visible report error in modal?
      logger.warn('Notifications could not be enabled, see prior logs for details.');
      return false;
    }
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
 * @param pushRegistration the push registration to delete
 * @returns whether the operation was successful.
 */
export const deletePushRegistration = async (pushRegistration: LocalPushRegistration) => {
  if (isWebPushRegistration(pushRegistration)) {
    const { endpoint: endpointToDelete } = pushRegistration.subscription;

    // Check if the current device supports web push, and if its current endpoint
    // (if any) matches the registration to delete
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
              logger.log(
                'Successfully deleted/unsubscribed the current web FCM registration:',
                pushRegistration.fcmToken
              );
              currentWebPushSubStore.set(null);
              await deletePushRegistrationDoc(pushRegistration);
              return true;
            } catch (e) {
              logger.error(e);
              Sentry.captureException(e);
              return false;
            }
          } else {
            logger.warn(
              'Failed to delete the FCM token that was marked to be deleted:',
              pushRegistration.fcmToken
            );
            return false;
          }
        })
        .catch((e) => {
          logger.error(e);
          return false;
        });
    }
    // Otherwise, the registration to delete is not for the current device/browser
    return await markForDeletion(pushRegistration);
  } else if (isNativePushRegistration(pushRegistration)) {
    // Check if we are on the same device
    if (!isNative) {
      // We're not on a native device, so surely we're on another device/browser
      // -> mark for deletion
      logger.log('Marking a native push registration for deletion from a web browser');
      return await markForDeletion(pushRegistration);
    }

    // From here on: assume we are on a native device
    const nativeDeviceId = get(deviceId);
    if (!nativeDeviceId) {
      logger.warn(
        `Device unexpectedly not loaded yet or null ${nativeDeviceId} on a native device`
      );
      return false;
    }
    const localNativeToken = await resolveOnNativePushTokenLoaded();
    if (nativeDeviceId !== pushRegistration.deviceId) {
      logger.log('Marking a native push registration for deletion from another native device');
      return await markForDeletion(pushRegistration);
    } else if (localNativeToken !== pushRegistration.fcmToken) {
      // We're on the same the device connected to the pushRegistration we're trying to delete,
      // but we already have a new local FCM token. Don't call .unregister() since we would be
      // pre-emptively unregistering our fresh token which still has to be uploaded.
      // Just delete the old irrelevant registration. This may happen after reinstall on Android.
      DEV: logger.debug(
        `Deleting push registration without unregistering locally because we're on the same device with a new token ${pushRegistration.fcmToken}`
      );
      await deletePushRegistrationDoc(pushRegistration);
      return true;
    } else {
      // We're on the current device, unregister the local registration before deleting
      return await PushNotifications.unregister()
        .then(async () => {
          try {
            logger.log(
              'Successfully deleted/unsubscribed the current native FCM registration:',
              pushRegistration.fcmToken
            );
            currentWebPushSubStore.set(null);
            await deletePushRegistrationDoc(pushRegistration);
            return true;
          } catch (e) {
            logger.error('Failed to delete the current native FCM registration', e);
            Sentry.captureException(e);
            return false;
          }
        })
        .catch((e) => {
          logger.warn('Failed to delete the FCM token that was marked to be deleted.');
          Sentry.captureException(e);
          return false;
        });
    }
  } else {
    // Note: this should not happen. A pushRegistration should be either web or native.
    Sentry.captureMessage('Trying to delete a push registration that is neither web or native', {
      level: 'error',
      extra: pushRegistration
    });
    // Mark for deletion in any case
    return await markForDeletion(pushRegistration);
  }
};

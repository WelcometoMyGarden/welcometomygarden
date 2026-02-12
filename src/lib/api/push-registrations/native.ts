import notification from '$lib/stores/notification';
import {
  deviceId,
  isEnablingLocalPushRegistration,
  pushRegistrations
} from '$lib/stores/pushRegistrations';
import {
  PushRegistrationStatus,
  type FirebaseNativePushRegistration
} from '$lib/types/PushRegistration';
import { goto } from '$lib/util/navigate';
import {
  handleError,
  isNativePushRegistration,
  pushRegistrationsColRef
} from '$lib/util/push-registrations';
import removeUndefined from '$lib/util/remove-undefined';
import { isNative } from '$lib/util/uaInfo';
import { Device, type DeviceInfo } from '@capacitor/device';
import {
  type ActionPerformed,
  type PushNotificationSchema,
  PushNotifications,
  type Token
} from '@capacitor/push-notifications';
import { addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { t } from 'svelte-i18n';
import { get } from 'svelte/store';
import type { IDevice } from 'ua-parser-js';
import { LocalNotifications } from '@capacitor/local-notifications';
import logger from '$lib/util/logger';
import nProgress from 'nprogress';

function handleLink(link: string) {
  const { pathname, search, hash } = new URL(link);
  goto(`${pathname}${search}${hash}`);
}

export const isDirectPushPermissionAndroid = async () => {
  const { platform, androidSDKVersion, osVersion } = await Device.getInfo();
  return (
    platform === 'android' &&
    ((typeof androidSDKVersion === 'number' && androidSDKVersion <= 32) ||
      parseInt(osVersion.split('.')[0] ?? '13') <= 12)
  );
};

// Set up listeners for notifications
export function initializeNativePush() {
  if (!isNative) {
    logger.debug('Not considered native, stopping native push init');
    return;
  }

  logger.debug('Initializing native push');

  Device.getId().then((r) => deviceId.set(r.identifier));

  // Show us the notification payload if the app is open on our device
  PushNotifications.addListener(
    'pushNotificationReceived',
    async (notification: PushNotificationSchema) => {
      logger.debug('Push received: ' + JSON.stringify(notification));
      const { display } = await LocalNotifications.checkPermissions();
      if (display !== 'granted') {
        alert(`display is ${display}`);
        return;
      }

      const min = -2147483648;
      const max = 2147483647;
      await LocalNotifications.schedule({
        notifications: [
          {
            title: notification.title!,
            body: notification.body!,
            id: Math.floor(Math.random() * (max - min + 1) + min),
            extra: notification.data
          }
        ]
      });
    }
  );

  // Method called when tapping on a notification
  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (notification: ActionPerformed) => {
      try {
        const link = notification.notification.data?.link;
        handleLink(link);
      } catch (e) {
        logger.error(e);
        alert(JSON.stringify(e));
      }
      // alert('Push action performed: ' + JSON.stringify(notification));
    }
  );

  LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
    try {
      const link = notification.notification.extra.link;
      handleLink(link);
    } catch (e) {
      alert(JSON.stringify(e));
    }
  });
}

export async function registerOrRefreshNativeRegistration() {
  // Set up listeners
  const tokenPromise = new Promise<string>(async (resolve, reject) => {
    // On success, we should be able to receive notifications
    const successListener = await PushNotifications.addListener(
      'registration',
      async (token: Token) => {
        await removeListeners();
        resolve(token.value);
      }
    );
    const errorListener = await PushNotifications.addListener(
      'registrationError',
      async (error: any) => {
        await removeListeners();
        reject(error);
      }
    );
    // To make sure that the register() method can be called multiple times, without invoking old
    // listeners
    const removeListeners = () => Promise.all([successListener.remove(), errorListener.remove]);
  });

  // Register with Apple / Google to receive push via APNS/FCM
  PushNotifications.register();
  return await tokenPromise;
}

/**
 * Adds the registration to the Firestore. Normally only runs on the first time.
 *
 * In edge cases (like having the TestFlight app and Debug app installed after eachother),
 * the device ID may be different despite the FCM token being the same. In that case, this updates the device ID
 */
async function registerNotifications() {
  // Get device info
  let fcmToken: string;
  let info: DeviceInfo;
  let nativeDeviceId: string | null | undefined;

  try {
    info = await Device.getInfo();
    nativeDeviceId = get(deviceId);
    if (!nativeDeviceId) {
      logger.error("Couldn't get the native device ID while adding the push registration");
      return false;
    }
  } catch (e) {
    handleError(undefined, 'Something went wrong while getting device information.');
    return false;
  }

  try {
    fcmToken = await registerOrRefreshNativeRegistration();
  } catch (e) {
    logger.error(e);
    return false;
  }

  const localPushRegistrations = get(pushRegistrations);

  const prWithSameToken = localPushRegistrations.find((pR) => pR.fcmToken === fcmToken);

  // If the resulting push registration was already stored exactly,
  // do not add it again. Show an error, since this should be prevented
  // by a device ID check by the caller and we want to debug this situation.
  if (
    prWithSameToken &&
    isNativePushRegistration(prWithSameToken) &&
    prWithSameToken.deviceId === nativeDeviceId
  ) {
    logger.warn('Tried to add an already-known push registration; this should not happen.');
    handleError(undefined, 'It looks like you already had notifications activated on this device.');
    return false;
  }

  const upsertProperties = {
    status: PushRegistrationStatus.ACTIVE,
    deviceId: nativeDeviceId,
    ua: removeUndefined({
      os: info.operatingSystem,
      browser: null,
      device: {
        vendor: info.manufacturer,
        model: info.model
      } as IDevice
    }),
    refreshedAt: serverTimestamp()
  };

  try {
    if (prWithSameToken) {
      // If the result push registration FCM token already exists, then the device
      // properties may have changed, update them. There may be some edge cases where
      // this happens.
      await updateDoc(pushRegistrationsColRef().doc(prWithSameToken.id), upsertProperties);
    } else {
      // No PR exists yet in Firestore, add it (default situation)
      await addDoc<FirebaseNativePushRegistration, FirebaseNativePushRegistration>(
        pushRegistrationsColRef(),
        {
          fcmToken,
          createdAt: serverTimestamp(),
          ...upsertProperties
        } satisfies FirebaseNativePushRegistration
      );
    }
    // Success
    isEnablingLocalPushRegistration.set(false);
    nProgress.done();
    if (!(await isDirectPushPermissionAndroid())) {
      // If we're on an Android version which didn't prompt for permissions, then
      // also don't display a confusing prompt
      notification.success(get(t)('push-notifications.registration-success'));
    }
    return true;
  } catch (e) {
    logger.error(e);
  }
  return false;
}

export const createNativePushRegistration = async () => {
  // Start loading state indicator
  isEnablingLocalPushRegistration.set(true);
  // Progress indicator for native subs without the notification modal
  nProgress.start();

  const { receive: permissionStatus } = await PushNotifications.checkPermissions();
  // Request permission to use push notifications
  // iOS will prompt user and return if they granted permission or not
  // Android <=12 will just grant without prompting, Android 13 (SDK 33) also prompts the user
  try {
    if (permissionStatus !== 'denied' && permissionStatus !== 'granted') {
      await PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
        } else {
          // Show some error
          logger.warn('The user has not granted permissions for notifications');
          throw Error();
        }
      });
    }
  } catch (e) {
    logger.warn("Couldn't get push registration permission");
  }
  //
  // TODO question: is the registration event only called after registering?
  return await registerNotifications();
};

export const unregisterNotifications = async () => {
  try {
    await PushNotifications.unregister();
    await PushNotifications.removeAllListeners();
    return true;
  } catch (e) {
    logger.error(e);
    return false;
  }
};

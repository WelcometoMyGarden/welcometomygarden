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
import { handleError, pushRegistrationsColRef } from '$lib/util/push-registrations';
import removeUndefined from '$lib/util/remove-undefined';
import { isNative } from '$lib/util/uaInfo';
import { Device } from '@capacitor/device';
import {
  type ActionPerformed,
  type PushNotificationSchema,
  PushNotifications,
  type Token
} from '@capacitor/push-notifications';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { t } from 'svelte-i18n';
import { get } from 'svelte/store';
import type { IDevice } from 'ua-parser-js';
import { LocalNotifications } from '@capacitor/local-notifications';

function handleLink(link: string) {
  const { pathname, search, hash } = new URL(link);
  goto(`${pathname}${search}${hash}`);
}

// Set up listeners for notifications
export function initializeNativePush() {
  if (!isNative) {
    return;
  }

  Device.getId().then((r) => deviceId.set(r.identifier));

  // Show us the notification payload if the app is open on our device
  PushNotifications.addListener(
    'pushNotificationReceived',
    async (notification: PushNotificationSchema) => {
      console.debug('Push received: ' + JSON.stringify(notification));
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
        console.error(e);
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
 * Only for the first time
 * @returns
 */
async function registerNotifications() {
  let fcmToken: string;
  try {
    fcmToken = await registerOrRefreshNativeRegistration();

    // If the resulting push registration was already stored, do not add it again.
    if (get(pushRegistrations).find((pR) => pR.fcmToken === fcmToken)) {
      console.warn('Tried to add an already-known push registration; this should not happen.');
      handleError(
        undefined,
        'It looks like you already had notifications activated on this device.'
      );
      return;
    }
  } catch (e) {
    console.error(e);
    return;
  }

  try {
    // Add the registration to the Firestor
    const info = await Device.getInfo();
    const nativeDeviceId = get(deviceId);
    if (!nativeDeviceId) {
      console.error("Couldn't get the native device ID while adding the push registration");
      return false;
    }
    await addDoc<FirebaseNativePushRegistration, FirebaseNativePushRegistration>(
      pushRegistrationsColRef(),
      {
        status: PushRegistrationStatus.ACTIVE,
        fcmToken,
        deviceId: nativeDeviceId,
        ua: removeUndefined({
          os: info.operatingSystem,
          browser: null,
          device: {
            vendor: info.manufacturer,
            model: info.model
          } as IDevice
        }),
        createdAt: serverTimestamp(),
        refreshedAt: serverTimestamp()
      } satisfies FirebaseNativePushRegistration
    );
    // Success
    isEnablingLocalPushRegistration.set(false);
    notification.success(get(t)('push-notifications.registration-success'));
    return true;
  } catch (e) {
    console.error(e);
  }
}

export const createNativePushRegistration = async () => {
  // Start loading state indicator
  isEnablingLocalPushRegistration.set(true);

  const { receive: permissionStatus } = await PushNotifications.checkPermissions();
  // Request permission to use push notifications
  // iOS will prompt user and return if they granted permission or not
  // Android will just grant without prompting
  // Android 13 requires a permission check in order to receive push notifications.
  // call requestPermissions() accordingly when targeting SDK 33.
  // use checkPremissions() to see if permissions were given.
  //
  try {
    if (permissionStatus !== 'denied' && permissionStatus !== 'granted') {
      await PushNotifications.requestPermissions().then((result) => {
        if (result.receive === 'granted') {
        } else {
          // Show some error
          console.warn('The user has not granted permissions for ');
          throw Error();
        }
      });
    }
  } catch (e) {
    console.warn("Couldn't get push registration permission");
  }
  //
  // TODO question: is the registration event only called after registering?

  await registerNotifications();
};

export const unregisterNotifications = async () => {
  try {
    await PushNotifications.unregister();
    await PushNotifications.removeAllListeners();
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

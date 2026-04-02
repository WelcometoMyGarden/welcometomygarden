import notification from '$lib/stores/notification';
import {
  deviceId,
  isEnablingLocalPushRegistration,
  localNativeRegistrationFCMToken,
  pushRegistrations
} from '$lib/stores/pushRegistrations';
import {
  PushRegistrationStatus,
  type FirebaseNativePushRegistration
} from '$lib/types/PushRegistration';
import { goto, isRelativeURL } from '$lib/util/navigate';
import {
  handleError,
  isNativePushRegistration,
  pushRegistrationsColRef,
  pushRegistrationDocRef
} from '$lib/util/push-registrations';
import removeUndefined from '$lib/util/remove-undefined';
import { isNative } from '$lib/util/uaInfo';
import { Device } from '@capacitor/device';
import {
  type ActionPerformed,
  type PushNotificationSchema,
  PushNotifications,
  type Token
} from '@capacitor/push-notifications';
import { addDoc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { t } from 'svelte-i18n';
import { get } from 'svelte/store';
import type { IDevice } from 'ua-parser-js';
import { LocalNotifications } from '@capacitor/local-notifications';
import logger from '$lib/util/logger';
import nProgress from 'nprogress';
import { rootModal } from '$lib/stores/app';
import NativeNotificationsDeniedModal from '$lib/components/Notifications/NativeNotificationsDeniedModal.svelte';
import { Capacitor } from '@capacitor/core';
import { page } from '$app/state';
import { unlocalizePath } from '$lib/routes';
import { PUBLIC_WTMG_HOST } from '$env/static/public';
import * as Sentry from '@sentry/sveltekit';

/**
 * Android Notification Channel ID
 */

export const CHAT_NOTIFICATIONS_CHANNEL_ID = 'chat-notifications';

function handleLink(link: string) {
  const { pathname, search, hash } = new URL(link);
  goto(`${pathname}${search}${hash}`);
}

/**
 * Extracts the chatId from a push notification link URL.
 * Link format (after unlocalization): /chat/{senderFirstName}/{chatId}
 * Returns null if the link is not a chat link or cannot be parsed.
 */
function extractChatIdFromLink(link: string | undefined): string | null {
  if (!link) return null;
  try {
    // Strip query params & hashes if any
    const pathname = new URL(isRelativeURL(link) ? `${PUBLIC_WTMG_HOST}${link}` : link).pathname;
    const unlocalized = unlocalizePath(pathname);
    // Expected: /chat/{name}/{chatId}
    const parts = unlocalized.split('/').filter(Boolean);
    if (parts[0] === 'chat' && parts.length >= 3) {
      return parts[2];
    }
  } catch (e) {
    // Malformed URL - ignore
  }
  return null;
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
    DEV: logger.debug('Not considered native, stopping native push init');
    return;
  }

  DEV: logger.debug('Initializing native push');

  Device.getId().then((r) => deviceId.set(r.identifier));

  // Show us the notification payload if the app is open on our device
  // Note: this event only fires when the app is in the foreground; FCM delivers
  // directly to the system tray when the app is backgrounded.
  PushNotifications.addListener(
    'pushNotificationReceived',
    async (notification: PushNotificationSchema) => {
      DEV: logger.debug('Push received: ' + JSON.stringify(notification));

      // If the user is actively viewing the chat this notification is for,
      // skip showing a local notification — they can already see the message.
      const notifChatId = extractChatIdFromLink(notification.data?.link);
      if (notifChatId) {
        const isViewingThisChat =
          page.params?.chatId === notifChatId && page.route?.id?.includes('[chatId]');
        if (isViewingThisChat) {
          DEV: logger.debug('Skipping local notification: user is viewing this chat');
          return;
        }
      }

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
            extra: notification.data,
            // smallIcon & iconColor are configured in capacitor.config.ts
            channelId: CHAT_NOTIFICATIONS_CHANNEL_ID
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

  // Delete the default notification channel created by the LocalNotifications plugin
  // see https://github.com/ionic-team/capacitor-plugins/issues/2490
  if (Capacitor.getPlatform() === 'android') {
    PushNotifications.deleteChannel({ id: 'default' })
      .then(() => {
        DEV: logger.debug('Unused LocalNotifications default channel deleted');
      })
      .catch((e) => {
        logger.warn(
          'Issue when deleting the LocalNotifications default channel',
          e instanceof Error ? e.message : ''
        );
      });
  }

  LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
    try {
      const link = notification.notification.extra.link;
      handleLink(link);
    } catch (e) {
      alert(JSON.stringify(e));
    }
  });

  /*
   * Note: we've observed that the 'registration' event will trigger called even without calling PushNotifications.register(),
   * at least on Android, after a reinstall (perhaps on every new install?).
   *
   * We require the token to be aware of whether the registration was loaded, because it is necessary to ensure that
   * .capacitorDidRegisterForRemoteNotifications was called before initing or changing badge counts. It is also helpful
   * for remote push registration state management and comparisons.
   *
   * Therefore, we always proactively call .register() on init and wait for results with resolveOnNativePushTokenLoaded
   * On Android, this will lead to a double 'regisration' event after reinstall and perhaps install.
   * On iOS, it should not, even on a reinstall, but our manual .register() will return a token when notifs are in 'prompt' too.
   */
  PushNotifications.addListener('registration', (token: Token) => {
    DEV: logger.info('Native FCM token retrieved', token.value);
    localNativeRegistrationFCMToken.set(token.value);
  });
  PushNotifications.addListener('registrationError', (e) => {
    DEV: logger.debug('Error retrieving FCM token');
    Sentry.captureException(e, { extra: { context: 'Native push registration error' } });
  });
  DEV: logger.debug('Registing for local native push');
  PushNotifications.register();
}

/**
 * Resolves as soon as a local native push token is available, with the token
 */
export const resolveOnNativePushTokenLoaded = async () => {
  const currentToken = get(localNativeRegistrationFCMToken);
  if (typeof currentToken === 'string') {
    // check for token, because we start off with not loading an a null token
    return Promise.resolve(currentToken);
  }
  return new Promise<string>((resolve) => {
    const unsubFromLoading = localNativeRegistrationFCMToken.subscribe((token) => {
      if (typeof token === 'string') {
        unsubFromLoading();
        resolve(token);
      }
    });
  });
};

export function setupAndroidChannels() {
  if (Capacitor.getPlatform() === 'android') {
    // Upsert notification channels - only relevant on Android
    // The name will be updated if the ID is the same
    return PushNotifications.createChannel({
      id: CHAT_NOTIFICATIONS_CHANNEL_ID,
      name: get(t)('push-notifications.android-channel')
    }).catch((e) => {
      logger.warn(
        'Something went wrong while creating the chat messages channel',
        e instanceof Error ? e.message : ''
      );
    });
  }
  return Promise.resolve('Not relevant on iOS or web');
}
export async function registerOrRefreshNativeRegistration() {
  DEV: logger.debug('Registering native push notifications due to creation or refresh');
  // Set up listeners
  const tokenPromise = new Promise<string>(async (resolve, reject) => {
    // On success, we should be able to receive notifications
    const successListener = await PushNotifications.addListener(
      'registration',
      async (token: Token) => {
        await removeListeners();
        DEV: logger.debug('Successfully registered native push with FCM token', token.value);
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

export const getNativeUAInfo = async () => {
  const info = await Device.getInfo();
  return {
    os: info.operatingSystem,
    browser: null,
    device: {
      vendor: info.manufacturer,
      // On iOS,
      // - without entitlements that would give the configured device name (which we don't need), the info.name is a model name like "iPhone 16e"
      // - info.model is the Apple model code for the device, in this case iPhone17,5, which is never used in marketing
      //   and therefore confusing
      model: Capacitor.getPlatform() === 'ios' ? info.name : info.model
    } as IDevice
  };
};

/**
 * Adds the registration to the Firestore. Normally only runs on the first time.
 *
 * In edge cases (like having the TestFlight app and Debug app installed after eachother),
 * the device ID may be different despite the FCM token being the same. In that case, this updates the device ID
 */
async function registerNotifications() {
  // Get device info
  let fcmToken: string;
  let nativeDeviceId: string | null | undefined;
  try {
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
  // by a device ID check by the caller, and we want to debug this situation.
  if (
    prWithSameToken &&
    isNativePushRegistration(prWithSameToken) &&
    prWithSameToken.deviceId === nativeDeviceId
  ) {
    logger.warn('Tried to add an already-known push registration; this should not happen.');
    handleError(undefined, 'It looks like you already had notifications activated on this device.');
    return false;
  }

  // If there are other PRs with the same device ID, but with different tokens, those should be deleted
  // before we add new one. This might happen after an app reinstall (especially on Android, where at least
  // in emulators the device IDs are stable). Normally, there should only be one in such a case.
  const prsWithSameDeviceId = localPushRegistrations.filter(
    (pR) => isNativePushRegistration(pR) && pR.deviceId == nativeDeviceId
  );
  if (prsWithSameDeviceId.length > 0) {
    logger.log(
      `Deleting ${prsWithSameDeviceId.length} push registrations with the same device ID while adding a new one. Deleting: ${prsWithSameDeviceId.map((pR) => pR.fcmToken).join(',')}`
    );
    try {
      await Promise.all(prsWithSameDeviceId.map(({ id }) => deleteDoc(pushRegistrationDocRef(id))));
    } catch (e) {
      logger.error(
        'Error while deleting previous push registrations connected to the same device',
        e instanceof Error ? e.message : ''
      );
    }
  }

  const upsertProperties = {
    status: PushRegistrationStatus.ACTIVE,
    deviceId: nativeDeviceId,
    ua: removeUndefined(await getNativeUAInfo()),
    refreshedAt: serverTimestamp()
  };

  try {
    if (prWithSameToken) {
      // If the resulting push registration FCM token already exists on another device ID,
      // then the device properties may have changed, update them. There may be some edge cases where
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
      // also don't display a confusing toast that something happened
      notification.success(get(t)('push-notifications.registration-success'));
    }
    return true;
  } catch (e) {
    logger.error(e);
  }
  return false;
}

export const createNativePushRegistration = async (showModalWhenDenied = true) => {
  // Start loading state indicator
  isEnablingLocalPushRegistration.set(true);
  // Progress indicator for native subs without the notification modal
  nProgress.start();

  let { receive: permissionStatus } = await PushNotifications.checkPermissions();
  DEV: logger.debug('Native notification permission status:', permissionStatus);

  // Request permission to use push notifications
  // iOS will prompt user and return if they granted permission or not
  // Android <=12 will just grant without prompting, Android 13 (SDK 33) also prompts the user
  try {
    if (permissionStatus === 'denied') {
      logger.warn(
        `Notification status is denied${showModalWhenDenied === false ? ", won't prompt" : ', will show instructions modal'}`
      );
      if (showModalWhenDenied) {
        rootModal.set(NativeNotificationsDeniedModal);
      }
      isEnablingLocalPushRegistration.set(false);
      return false;
    }

    // Prompt if possible
    if (permissionStatus !== 'granted') {
      logger.debug('Prompting for notification permission');
      permissionStatus = await PushNotifications.requestPermissions()
        .then((result) => {
          if (result.receive === 'granted') {
            return result.receive;
          } else {
            logger.warn('The user has not granted permissions for notifications:', result.receive);
            return 'denied';
          }
        })
        .catch((e) => {
          logger.warn('Error while trying to request push notification permission', e);
          return 'denied';
        });
    }

    // Continue if granted
    if (permissionStatus === 'granted') {
      logger.log('Push notification permission granted, registering native push');
      nProgress.done();
      return await registerNotifications();
    }

    // Else: some kind of denial only happened after requesting permissions
    // Stop enable loader in any case.
    isEnablingLocalPushRegistration.set(false);
  } catch (e) {
    // Note: unlike on web push, we're not showing an error modal, except in a few
    // unexpected cases (not all) in registerNotifications()
    logger.warn("Couldn't get push registration permission", e instanceof Error ? e.message : '');
  }
  nProgress.done();
  return false;
  // TODO question: is the registration event only called after registering?
};

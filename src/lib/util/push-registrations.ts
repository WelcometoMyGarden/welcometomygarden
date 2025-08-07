import { rootModal } from '$lib/stores/app';
import { bind } from 'svelte-simple-modal';
import { iDeviceInfo, isNative, uaInfo } from './uaInfo';
import ErrorModal from '$lib/components/UI/ErrorModal.svelte';
import { isEnablingLocalPushRegistration } from '$lib/stores/pushRegistrations';
import { get } from 'svelte/store';
import { emailAsLink } from '$lib/constants';
import { t } from 'svelte-i18n';
import { collection, doc, DocumentReference } from 'firebase/firestore';
import type { CollectionReference } from '@firebase/firestore-types';
import { db } from '$lib/api/firebase';
import { getUser } from '$lib/stores/auth';
import { PUSH_REGISTRATIONS, USERS_PRIVATE } from '$lib/api/collections';
import type {
  FirebaseNativePushRegistration,
  FirebasePushRegistration,
  FirebaseWebPushRegistration,
  LocalPushRegistration
} from '$lib/types/PushRegistration';
import { UAParser } from 'ua-parser-js';

/**
 * Synchronous (and probably more limited) version of Firebase Messaging's isSupported function.
 * Returns true on native platforms.
 */
export const hasWebPushNotificationSupportNow = () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support the Notification API.');
    return false;
  } else if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('This browser does not support service workers.');
    return false;
  }
  return true;
};

/**
 * Synchronous (and probably more limited) version of Firebase Messaging's isSupported function.
 * Returns true on native platforms.
 */
export const hasNotificationSupportNow = () => {
  if (isNative) {
    return true;
  }
  return hasWebPushNotificationSupportNow();
};

/**
 * Does not have immediate support, but by changing some conditions, support can be achieved.
 */
export const canHaveWebPushSupport = () => {
  const { isIDevice, isUpgradeable16IDevice, is_16_4_OrAboveIDevice } = iDeviceInfo!;
  return (
    !hasWebPushNotificationSupportNow() &&
    isIDevice &&
    (is_16_4_OrAboveIDevice || isUpgradeable16IDevice)
  );
};

export const isOnIDevicePWA = () => {
  const { isIDevice, iDeviceVersion } = iDeviceInfo!;
  // The last version check is probably redundant
  return hasWebPushNotificationSupportNow() && isIDevice && iDeviceVersion! >= 16.4;
};

/**
 * Shows an error in a modal with the given description. Also includes user agent information.
 * @param error
 * @param specifier HTML string
 */
export const handleErrorGeneric = (error: unknown, specifier: string) => {
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
export const handleError = (error: unknown, extraInfo?: string) => {
  const errorModalSpecifier = get(t)('push-notifications.error.generic', {
    values: {
      emailLink: emailAsLink
    }
  });
  handleErrorGeneric(error, `${errorModalSpecifier}${extraInfo ? `<br><br>${extraInfo}` : ''}`);
};

/**
 * Push registrations collection reference
 */
export const pushRegistrationsColRef = () =>
  collection(
    db(),
    USERS_PRIVATE,
    getUser().uid,
    PUSH_REGISTRATIONS
  ) as unknown as CollectionReference<FirebasePushRegistration, FirebasePushRegistration>;

export const pushRegistrationDocRef = (id: string) =>
  doc(
    db(),
    USERS_PRIVATE,
    getUser().uid,
    PUSH_REGISTRATIONS,
    id
  ) as DocumentReference<FirebasePushRegistration>;

export const isWebPushRegistration = (
  pr: LocalPushRegistration
): pr is FirebaseWebPushRegistration & { id: string } =>
  typeof (pr as any)['subscription'] !== 'undefined';

export const isNativePushRegistration = (
  pr: LocalPushRegistration
): pr is FirebaseNativePushRegistration & { id: string } =>
  typeof (pr as any)['deviceId'] !== 'undefined';

export const isAndroidFirefox = () =>
  uaInfo?.os.is('Android') && uaInfo?.browser.name?.includes('Firefox');

export const getDeviceUAWithClientHints = async () => {
  const uaP = new UAParser();
  const deviceWithClientHints = await uaP.getDevice().withFeatureCheck().withClientHints();
  if (deviceWithClientHints.model === 'K') {
    deviceWithClientHints.model = 'Android';
  }
  return deviceWithClientHints;
};

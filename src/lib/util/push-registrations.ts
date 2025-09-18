import { browser } from '$app/environment';
import { iDeviceInfo } from './uaInfo';

/**
 * Synchronous (and probably more limited) version of Firebase Messaging's isSupported function
 */
export const hasNotificationSupportNow = () => {
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
 * Does not have immediate support, but by changing some conditions, support can be achieved.
 */
export const canHaveNotificationSupport = () => {
  if (!browser) {
    return false;
  }
  const { isIDevice, isUpgradeable16IDevice, is_16_4_OrAboveIDevice } = iDeviceInfo!;
  return (
    !hasNotificationSupportNow() && isIDevice && (is_16_4_OrAboveIDevice || isUpgradeable16IDevice)
  );
};

export const isOnIDevicePWA = () => {
  if (!browser) {
    return false;
  }
  const { isIDevice, iDeviceVersion } = iDeviceInfo!;
  // The last version check is probably redundant
  return hasNotificationSupportNow() && isIDevice && iDeviceVersion! >= 16.4;
};

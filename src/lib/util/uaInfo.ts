import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import { UAParser } from 'ua-parser-js';
import logger from './logger';

/**
 * ua-parser-js object, only available in a browser context.
 */

// The feature check extension does seem to only result in synchronous results
// https://docs.uaparser.dev/api/main/idata/with-feature-check.html
export const uaInfo = browser
  ? (UAParser(navigator.userAgent).withFeatureCheck() as UAParser.IResult)
  : undefined;

/**
 * @param osName note: native iOS has been reported and saved as 'ios',
 *       web push has been reported and saved as 'iOS', therefore we use a case-insensitive match
 * @returns
 */
export const isIDeviceOS = (osName: string) => /iOS|iPadOS/i.test(osName);

export const iDeviceInfo = browser
  ? (() => {
      // TODO: wasn't the iPad Pro masquerading as a Mac?
      const ua = uaInfo!;
      const isIDevice = isIDeviceOS(ua.os.name ?? '') || /iPad|iPhone/.test(ua.device.model ?? '');
      const versionString = ua.os.version ?? ua.browser.version ?? null;
      const iDeviceVersion = versionString ? Number.parseFloat(versionString) : null;
      // note: os.name is not reliable
      const currentAppleDevice = ua.device.model ?? 'iPhone or iPad';
      const currentAppleOS =
        currentAppleDevice === 'iPhone'
          ? 'iOS'
          : currentAppleDevice === 'iPad'
            ? 'iPadOS'
            : 'iOS or iPadOS';
      /**
       * Version 16 iDevices < 16.4 can surely be upgraded to 16.4, which support notifications, see below.
       */
      const isUpgradeable16IDevice =
        (isIDevice && iDeviceVersion && iDeviceVersion >= 16 && iDeviceVersion < 16.4) || false;
      /**
       * Whether this is likely an iDevice that supports notifications on Home Screen apps.
       * https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
       */
      const is_16_4_OrAboveIDevice = isIDevice && iDeviceVersion && iDeviceVersion >= 16.4;

      return {
        isIDevice,
        isUpgradeable16IDevice,
        is_16_4_OrAboveIDevice,
        iDeviceVersion,
        currentAppleDevice,
        currentAppleOS
      };
    })()
  : undefined;

export const isNative = Capacitor.isNativePlatform();

/**
 * Whether this device is a mobile web browser (detected by UA check).
 * Explicitly excludes native Capacitor apps (those are "native app devices", despite the webview).
 * Should include PWA/homes screen apps.
 */
export const isMobileWebDevice =
  !isNative &&
  (uaInfo
    ? ((device) =>
        (device.type && (device.type === 'mobile' || device.type === 'tablet')) || false)(
        uaInfo!.device
      )
    : undefined);

/**
 * Whether this is a native Capacitor device, or a detected mobile web browser.
 */
export const isMobileDevice = isNative || isMobileWebDevice;

/**
 * Synchronous (and probably more limited) version of Firebase Messaging's isSupported function.
 * Returns true on native platforms.
 */
export const hasWebPushNotificationSupportNow = () => {
  if (isNative || !browser) {
    return false;
  }
  if (!('Notification' in window)) {
    logger.warn('This browser does not support the Notification API.');
    return false;
  } else if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    logger.warn('This browser does not support service workers.');
    return false;
  }
  return true;
};

export const isOnIDevicePWA = () => {
  if (!browser) {
    return false;
  }
  const { isIDevice, iDeviceVersion } = iDeviceInfo!;
  // The last version check is probably redundant
  return hasWebPushNotificationSupportNow() && isIDevice && iDeviceVersion! >= 16.4;
};

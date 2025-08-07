import { browser } from '$app/environment';
import { Capacitor } from '@capacitor/core';
import { UAParser } from 'ua-parser-js';

/**
 * ua-parser-js object, only available in a browser context.
 */

// The feature check extension does seem to only result in synchronous results
// https://docs.uaparser.dev/api/main/idata/with-feature-check.html
export const uaInfo = browser
  ? (UAParser(navigator.userAgent).withFeatureCheck() as UAParser.IResult)
  : undefined;

export const isIDeviceOS = (osName: string) => /iOS|iPadOS/.test(osName);

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

export const isMobileDevice = uaInfo
  ? ((device) => (device.type && (device.type === 'mobile' || device.type === 'tablet')) || false)(
      uaInfo!.device
    )
  : undefined;

export const isNative = Capacitor.isNativePlatform();

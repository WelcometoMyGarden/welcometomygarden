import { Badge } from '@capawesome/capacitor-badge';
import { PushNotifications } from '@capacitor/push-notifications';
import * as Sentry from '@sentry/sveltekit';
import logger from '$lib/util/logger';
import { isNative } from '$lib/util/uaInfo';
import { localNativeRegistrationFCMToken } from '$lib/stores/pushRegistrations';
import { get } from 'svelte/store';
import { Capacitor } from '@capacitor/core';

let badgeSupportChecked = false;
let badgeSupported = false;

/**
 * Checks whether badge display is supported and permitted on this device.
 * Only checks (never requests) permissions. Returns false silently if not supported.
 * Result is cached after the first call.
 *
 * Note:
 * - On Android (ShortcutBadger), there are no permissions.
 * - On iOS, the push notification permission already includes the badge permission.
 *
 * Thus, this should be called after we know that there is push notification permission
 * to avoid a double prompt.
 */
async function checkBadgeSupport(allowPotentialPromptForSupport = true): Promise<boolean> {
  // Note: this check can be removed if we know that all app distributions have support
  if (!Capacitor.isPluginAvailable('Badge')) {
    return false;
  }

  if (badgeSupportChecked) return badgeSupported;
  badgeSupportChecked = true;

  if (!isNative) {
    badgeSupported = false;
    return false;
  }

  try {
    const { isSupported } = await Badge.isSupported();
    if (!isSupported) {
      badgeSupported = false;
      return false;
    }

    let { display } = await Badge.checkPermissions();

    if (display !== 'granted') {
      const err = 'Badge not supported on this device (permission not granted)';
      if (allowPotentialPromptForSupport) {
        ({ display } = await Badge.requestPermissions());
      }
      logger.error(err, display);
      if (display !== 'granted') {
        Sentry.captureMessage(err, 'info');
        badgeSupported = false;
        return false;
      }
    }

    badgeSupported = true;
    return true;
  } catch (e) {
    logger.warn('Error checking badge support', e instanceof Error ? e.message : '');
    badgeSupported = false;
    return false;
  }
}

/**
 * Sets the OS-level app badge count.
 * count=0 clears the badge (and on iOS also clears all notifications).
 * Silently does nothing if badges are not supported.
 * Should only be called after push registration init (and its permission init)
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    if (!(await checkBadgeSupport())) return;
    if (count <= 0) {
      await Badge.clear();
    } else {
      await Badge.set({ count });
    }
  } catch (e) {
    logger.warn('Error setting badge count', e instanceof Error ? e.message : '');
  }
}

/**
 * Clears the OS-level app badge.
 * Silently does nothing if badges are not supported.
 */
export async function clearBadge(): Promise<void> {
  try {
    if (!(await checkBadgeSupport(false))) return;
    await Badge.clear();
  } catch (e) {
    logger.warn('Error clearing badge', e instanceof Error ? e.message : '');
  }
}

/**
 * Removes any delivered push notifications in the notification tray that are associated
 * with the given chatId (matched via the link URL in notification data).
 * Silently does nothing on non-native platforms or if an error occurs.
 */
export async function removeDeliveredNotificationsForChat(chatId: string): Promise<void> {
  // Don't use Push API methods if the registration is not known yet
  if (!isNative || !get(localNativeRegistrationFCMToken)) return;
  try {
    const { notifications } = await PushNotifications.getDeliveredNotifications();
    const toRemove = notifications.filter((n) => n.data?.link?.includes(chatId));
    if (toRemove.length > 0) {
      await PushNotifications.removeDeliveredNotifications({ notifications: toRemove });
    }
  } catch (e) {
    logger.warn(
      'Error removing delivered notifications for chat',
      e instanceof Error ? e.message : ''
    );
    Sentry.captureException(e);
  }
}

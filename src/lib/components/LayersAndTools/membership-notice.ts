import { browser } from '$app/environment';
import logger from '$lib/util/logger';

const MEMBERSHIP_NOTICE_KEY = 'membership-features-dismissed';

export function wasDismissed() {
  // On SSR it is not shown
  if (!browser) return true;
  try {
    const dateStr = localStorage.getItem(MEMBERSHIP_NOTICE_KEY);
    if (!dateStr) {
      // No dismissal stored, not dismissed
      return false;
    }
    // Remember dismissal within the year
    return Date.now() - new Date(dateStr).getTime() < 365 * 24 * 3600 * 1000;
  } catch (e) {
    // Dismiss on error
    return true;
  }
}

export function storeDismissal() {
  if (!browser) {
    return;
  }
  try {
    localStorage.setItem(MEMBERSHIP_NOTICE_KEY, new Date().toISOString());
  } catch (e) {
    logger.warn('Membership notice dismissal persistence failed', e);
  }
}

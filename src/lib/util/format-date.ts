import { getBrowserLangAndRegion } from './get-browser-lang';
import type { LocalizedMessage } from './translation-helpers';

/**
 * Normally, we store and use only simple 2-letter, language-only BCP-47 locales
 * without region specifiers. Sometimes, when the browser locale matches a simple
 * locale but is more specific, we want to use the more specific region-aware locale
 * for rendering e.g. time.
 *
 * This makes a difference in e.g. British English and American English time rendering,
 * where 'en' would default to en-US even though the browser is en-GB.
 */
function expandLocale(simpleLocale: string) {
  const langAndRegion = getBrowserLangAndRegion();
  if (langAndRegion && langAndRegion.lang === simpleLocale) {
    return [`${langAndRegion.lang}-${langAndRegion.region}`, simpleLocale];
  }
  return simpleLocale;
}

export const formatConversationCardTimestamp = (
  timestamp: number,
  locale: string
): string | LocalizedMessage => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60_000) return { key: 'generics.now' };

  // Show the time on the same day
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleString(expandLocale(locale), { hour: '2-digit', minute: '2-digit' });
  }

  const startOfToday = new Date(now.toDateString()).getTime();
  const startOfDay = new Date(date.toDateString()).getTime();
  const calendarDays = (startOfToday - startOfDay) / (24 * 60 * 60 * 1000);

  // Show the weekday if it was within the last 7 days
  if (calendarDays < 7) {
    return date.toLocaleString(expandLocale(locale), { weekday: 'short' });
  }

  // Otherwise, if still within the same year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleString(expandLocale(locale), { day: 'numeric', month: 'short' });
  }

  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export const formatMessageTimestamp = (timestamp: number, locale: string) => {
  const currentDate = new Date();
  const date = new Date(timestamp);
  if (date.getFullYear() !== currentDate.getFullYear()) {
    return date.toLocaleString(expandLocale(locale), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }); // example: 20 Aug 2020, 09:03
  } // different years
  else if (
    new Date(currentDate.toDateString()).getTime() - new Date(date.toDateString()).getTime() >
    7 * 24 * 60 * 60 * 1000
  ) {
    return date.toLocaleString(expandLocale(locale), {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }); // 5 August, 10:08
  } // same year, not within the last week
  else if (date.getDate() !== currentDate.getDate()) {
    return date.toLocaleString(expandLocale(locale), {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }); // Tuesday 15:00
  } // same year, same month but within the last 7 days
  else {
    return date.toLocaleString(expandLocale(locale), { hour: '2-digit', minute: '2-digit' }); //10:28
  } // same day
};

/** Returns local midnight of the current day. */
export const startOfToday = (): Date => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

/** Returns a new Date `days` calendar days after `base` (local time). */
export const addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

/** Formats a Date as `YYYY-MM-DD` from its local components, for `<input type="date">`. */
export const toDateInputValue = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** Parses a `YYYY-MM-DD` string into a local-midnight Date (for display/relative calculations). */
export const parseInputDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Number of whole calendar days between `now` and `date` (in local time). Never negative. */
export const calendarDaysUntil = (date: Date, now: Date = new Date()): number => {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
};

/** Long, locale-aware date e.g. "Wed 4 June 2026" (en) / "wo 4 juni 2026" (nl). */
export const formatLongDate = (date: Date, locale: string): string =>
  date
    .toLocaleDateString(expandLocale(locale), {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    .replace(/,/g, '');

/** Short, locale-aware date e.g. "4 Jun". */
export const formatShortDate = (date: Date, locale: string): string =>
  date
    .toLocaleDateString(expandLocale(locale), { day: 'numeric', month: 'short' })
    .replace(/\.$/, '');

/**
 * Locale-aware relative time e.g. "in 5 days", "in 2 weeks", using native `Intl.RelativeTimeFormat`.
 * Thresholds: < 14 days → days, < 60 → weeks, < 365 → months, else years.
 */
export const formatRelativeDate = (date: Date, locale: string): string => {
  const rtf = new Intl.RelativeTimeFormat(expandLocale(locale), { numeric: 'auto' });
  const days = calendarDaysUntil(date);
  if (days < 14) return rtf.format(days, 'day');
  if (days < 60) return rtf.format(Math.round(days / 7), 'week');
  if (days < 365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
};

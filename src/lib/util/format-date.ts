import type { LocalizedMessage } from './translation-helpers';

export const formatConversationCardTimestamp = (ms: number): string | LocalizedMessage => {
  const now = new Date();
  const date = new Date(ms);
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60_000) return { key: 'generics.now' };

  // Show the time on the same day
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleString([], { hour: '2-digit', minute: '2-digit' });
  }

  const startOfToday = new Date(now.toDateString()).getTime();
  const startOfDay = new Date(date.toDateString()).getTime();
  const calendarDays = (startOfToday - startOfDay) / (24 * 60 * 60 * 1000);

  // Show the weekday if it was within the last 7 days
  if (calendarDays < 7) {
    return date.toLocaleString([], { weekday: 'short' });
  }

  // Otherwise, if still within the same year
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleString([], { day: 'numeric', month: 'short' });
  }

  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
};

export const formatMessageTimestamp = (timestamp: number) => {
  const currentDate = new Date();
  const date = new Date(timestamp);
  if (date.getFullYear() !== currentDate.getFullYear()) {
    return date.toLocaleString([], {
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
    return date.toLocaleString([], {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }); //5 August, 10:08
  } // same year, not within the last week
  else if (date.getDate() !== currentDate.getDate()) {
    return date.toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' }); //Tuesday 15:00
  } // same year, same month but within the last 7 days
  else {
    return date.toLocaleString([], { hour: '2-digit', minute: '2-digit' }); //10:28
  } // same day
};

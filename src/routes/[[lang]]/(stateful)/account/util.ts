/**
 * Date helpers specific to the "temporarily unlist your garden" / automatic relisting feature.
 *
 * A garden that is unlisted "until a date" should reappear on the map at 10:00 in the
 * Europe/Brussels timezone on the chosen day. We compute that exact UTC instant here using only
 * native browser APIs (`Intl`), so it stays correct across the CET/CEST daylight-saving switch.
 */

const BRUSSELS_TZ = 'Europe/Brussels';

/** The hour (Brussels wall-clock time) at which gardens are relisted. */
export const RELIST_HOUR = 10;

/**
 * Given a calendar date (`YYYY-MM-DD`), returns the UTC time corresponding to `hour`:00 in the
 * Europe/Brussels timezone on that day.
 */
export const brusselsTimeOnDate = (dateStr: string, hour: number = RELIST_HOUR): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const givenDateTimeInUTC = Date.UTC(y, m - 1, d, hour, 0, 0);

  // Uses the offset-probe trick: interpret the wall-clock time as if it were UTC, see what wall-clock
  // that instant actually represents in Brussels, and correct by the difference. This handles both
  // CET (+1) and CEST (+2) without hardcoding offsets.

  // This tells you what RELIST_HOUR in UTC will look like in Brussels
  // It will be +1 or +2h depending on DST.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRUSSELS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date(givenDateTimeInUTC));

  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = Number(p.value);
  }
  // Some engines report midnight as hour 24; normalise to 0.
  const h = map.hour === 24 ? 0 : map.hour;

  // Reinterpret the Brussels time as if it is UTC.
  // This will add 1 or 2 hours in ms to `givenDateTimeInUTC`
  const brusselsDateTimeAsIfUTC = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    h,
    map.minute,
    map.second
  );

  // The offset is then (1 or 2) * 3600 * 1000
  const offset = brusselsDateTimeAsIfUTC - givenDateTimeInUTC;

  // The RELIST_HOUR time in Brussels will be
  // ${offset} hours earlier than the RELIST_HOUR in UTC
  return new Date(givenDateTimeInUTC - offset);
};

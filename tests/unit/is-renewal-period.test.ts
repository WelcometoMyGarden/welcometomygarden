import { describe, expect, it } from 'vitest';
import { isRenewalPeriod } from '$lib/util/is-renewal-period';

const startDate = 1_760_000_000;
const hours = (n: number) => n * 60 * 60;

describe('isRenewalPeriod', () => {
  it('is false when the first period starts at the subscription start', () => {
    expect(isRenewalPeriod({ startDate, currentPeriodStart: startDate })).toBe(false);
  });

  it('is false when the first period was re-anchored shortly after the start', () => {
    expect(isRenewalPeriod({ startDate, currentPeriodStart: startDate + hours(23) })).toBe(false);
  });

  it('is true for a period starting a year after the start', () => {
    expect(isRenewalPeriod({ startDate, currentPeriodStart: startDate + hours(24 * 365) })).toBe(
      true
    );
  });
});

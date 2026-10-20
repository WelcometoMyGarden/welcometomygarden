const ONE_DAY_SECS = 24 * 60 * 60;

/**
 * Whether the current period of a subscription is a renewal period, rather than its first period.
 *
 * Don't compare the two timestamps for equality: the first period may start a bit later than
 * the subscription itself, when its billing cycle anchor was reset by a price change shortly after
 * creation. Renewal periods start roughly a year after the start date.
 */
export const isRenewalPeriod = ({
  startDate,
  currentPeriodStart
}: {
  startDate: number;
  currentPeriodStart: number;
}) => currentPeriodStart - startDate > 30 * ONE_DAY_SECS;

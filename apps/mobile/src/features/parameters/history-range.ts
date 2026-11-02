export type HistoryPeriod = 'week' | 'month' | 'quarter' | 'year';

export type HistoryBucket = 'hour' | 'day' | 'week';

export const HISTORY_PERIODS: readonly HistoryPeriod[] = ['week', 'month', 'quarter', 'year'];

const DAY_MS = 86_400_000;

/** Long enough to read a trend, short enough to stay a few dozen points at most. */
const WINDOWS: Record<HistoryPeriod, { days: number;
  bucket: HistoryBucket }> = {
  week: {
    days: 7,
    bucket: 'hour',
  },
  month: {
    days: 30,
    bucket: 'day',
  },
  quarter: {
    days: 90,
    bucket: 'day',
  },
  year: {
    days: 365,
    bucket: 'week',
  },
};

export interface HistoryWindow {
  from: string;
  to: string;
  bucket: HistoryBucket;
}

/** The query for a period ending now. */
export function historyWindow (period: HistoryPeriod, now: Date): HistoryWindow {
  const { days, bucket } = WINDOWS[period];

  return {
    from: new Date(now.getTime() - days * DAY_MS).toISOString(),
    to: now.toISOString(),
    bucket,
  };
}

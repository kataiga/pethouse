import { historyWindow } from './history-range';

describe('historyWindow', () => {
  const now = new Date('2026-11-02T12:00:00.000Z');

  it.each([
    ['week', '2026-10-26T12:00:00.000Z', 'hour'],
    ['month', '2026-10-03T12:00:00.000Z', 'day'],
    ['quarter', '2026-08-04T12:00:00.000Z', 'day'],
    ['year', '2025-11-02T12:00:00.000Z', 'week'],
  ] as const)('a %s ends now and is bucketed for a readable chart', (period, from, bucket) => {
    expect(historyWindow(period, now)).toEqual({
      from,
      to: '2026-11-02T12:00:00.000Z',
      bucket,
    });
  });
});

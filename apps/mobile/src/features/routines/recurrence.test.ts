import {
  buildRecurrence, buildStart, defaultRecurrence, parseRecurrence, type Recurrence, recurrenceError,
} from './recurrence';

const START = '2026-11-02T10:00';

describe('parseRecurrence', () => {
  it.each([
    ['FREQ=DAILY;BYHOUR=8,20;BYMINUTE=0', {
      frequency: 'DAILY',
      interval: 1,
      times: [{
        hour: 8,
        minute: 0,
      }, {
        hour: 20,
        minute: 0,
      }],
    }],
    ['FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0', {
      frequency: 'DAILY',
      interval: 2,
    }],
    ['FREQ=WEEKLY;BYDAY=TH,MO;BYHOUR=19;BYMINUTE=0', {
      frequency: 'WEEKLY',
      weekdays: ['MO', 'TH'],
    }],
    ['FREQ=MONTHLY;BYDAY=1SA;BYHOUR=10;BYMINUTE=30', {
      frequency: 'MONTHLY',
      monthly: {
        kind: 'weekdayOfMonth',
        ordinal: 1,
        weekday: 'SA',
      },
      times: [{
        hour: 10,
        minute: 30,
      }],
    }],
    ['FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1;BYHOUR=10;BYMINUTE=0', {
      interval: 3,
      monthly: {
        kind: 'dayOfMonth',
        day: 1,
      },
    }],
    ['FREQ=MONTHLY;BYDAY=-1SU;BYHOUR=11;BYMINUTE=0', {
      monthly: {
        kind: 'weekdayOfMonth',
        ordinal: -1,
        weekday: 'SU',
      },
    }],
    ['rrule:freq=yearly', {
      frequency: 'YEARLY',
      times: [{
        hour: 10,
        minute: 0,
      }],
    }],
  ])('reads %p', (rrule, expected) => {
    expect(parseRecurrence(rrule, START)).toMatchObject(expected);
  });

  it.each([
    'FREQ=HOURLY',
    'FREQ=DAILY;COUNT=3',
    'FREQ=DAILY;BYDAY=MO',
    'FREQ=WEEKLY',
    'FREQ=WEEKLY;BYDAY=1MO',
    'FREQ=MONTHLY;BYMONTHDAY=1,15',
    'FREQ=MONTHLY;BYDAY=5SA',
    'FREQ=DAILY;BYHOUR=8;BYMINUTE=0,30',
    'FREQ=DAILY;BYHOUR=25',
    'FREQ=YEARLY;BYMONTH=3',
    'garbage',
  ])('keeps %p as a raw rule', (rrule) => {
    expect(parseRecurrence(rrule, START)).toBeNull();
  });
});

describe('buildRecurrence', () => {
  it('writes every seeded template rule back the way it was read', () => {
    for (const rule of [
      'FREQ=DAILY;BYHOUR=8,20;BYMINUTE=0',
      'FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
      'FREQ=DAILY;BYHOUR=8;BYMINUTE=30',
      'FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0',
      'FREQ=MONTHLY;BYDAY=1SA;BYHOUR=10;BYMINUTE=30',
      'FREQ=MONTHLY;BYDAY=1SU;BYHOUR=11;BYMINUTE=0',
      'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1;BYHOUR=10;BYMINUTE=0',
      'FREQ=MONTHLY;INTERVAL=6;BYMONTHDAY=1;BYHOUR=10;BYMINUTE=0',
      'FREQ=WEEKLY;BYDAY=MO,TH;BYHOUR=19;BYMINUTE=0',
      'FREQ=WEEKLY;BYDAY=SA;BYHOUR=10;BYMINUTE=0',
      'FREQ=WEEKLY;BYDAY=SA;BYHOUR=9;BYMINUTE=30',
      'FREQ=WEEKLY;BYDAY=SU;BYHOUR=11;BYMINUTE=0',
      'FREQ=WEEKLY;BYDAY=WE;BYHOUR=19;BYMINUTE=0',
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=SA;BYHOUR=10;BYMINUTE=0',
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=SU;BYHOUR=11;BYMINUTE=0',
    ]) {
      const parsed = parseRecurrence(rule, START);

      expect(parsed && buildRecurrence(parsed)).toBe(rule);
    }
  });

  it('orders weekdays from Monday and hours ascending, without duplicates', () => {
    const recurrence: Recurrence = {
      ...defaultRecurrence('WEEKLY', new Date(2026, 10, 2)),
      weekdays: ['SU', 'MO'],
      times: [{
        hour: 20,
        minute: 15,
      }, {
        hour: 8,
        minute: 15,
      }, {
        hour: 8,
        minute: 15,
      }],
    };

    expect(buildRecurrence(recurrence)).toBe('FREQ=WEEKLY;BYDAY=MO,SU;BYHOUR=8,20;BYMINUTE=15');
    expect(buildStart('2026-11-02', recurrence)).toBe('2026-11-02T08:15');
  });
});

describe('recurrenceError', () => {
  const daily = defaultRecurrence('DAILY', new Date(2026, 10, 2));

  it.each([
    [{ interval: 0 }, 'interval'],
    [{ times: [] }, 'noTime'],
    [{
      times: [{
        hour: 8,
        minute: 0,
      }, {
        hour: 20,
        minute: 30,
      }],
    }, 'mixedMinutes'],
    [{
      frequency: 'WEEKLY',
      weekdays: [],
    }, 'noWeekday'],
    [{
      frequency: 'MONTHLY',
      monthly: {
        kind: 'dayOfMonth',
        day: 32,
      },
    }, 'monthDay'],
  ] as const)('refuses %p with %p', (change, expected) => {
    expect(recurrenceError({
      ...daily,
      ...change,
      times: 'times' in change ? [...change.times] : daily.times,
      weekdays: 'weekdays' in change ? [...change.weekdays] : daily.weekdays,
    })).toBe(expected);
  });

  it('accepts the defaults', () => {
    expect(recurrenceError(daily)).toBeNull();
  });
});

describe('defaultRecurrence', () => {
  it('starts on the weekday and day of month of the start', () => {
    // 2 November 2026 is a Monday.
    expect(defaultRecurrence('WEEKLY', new Date(2026, 10, 2))).toMatchObject({
      weekdays: ['MO'],
      monthly: {
        kind: 'dayOfMonth',
        day: 2,
      },
    });
  });
});

import {
  hasAnyOccurrence,
  InvalidRecurrenceError,
  isLocalDateTime,
  nextOccurrences,
  normaliseRecurrence,
  occurrencesBetween,
} from './recurrence';

const iso = (dates: Date[]): string[] => dates.map((date) => date.toISOString());

describe('recurrence', () => {
  describe('normaliseRecurrence', () => {
    it('accepts a body with or without the RRULE: prefix and returns it canonical', () => {
      expect(normaliseRecurrence('RRULE:FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0'))
        .toBe('FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0');
      expect(normaliseRecurrence(' freq=weekly;byday=mo,th ')).toBe('FREQ=WEEKLY;BYDAY=MO,TH');
    });

    it.each([
      ['FREQ=HOURLY'],
      ['FREQ=MINUTELY;INTERVAL=5'],
      ['DTSTART:20260101T090000Z\nRRULE:FREQ=DAILY'],
      ['FREQ=DAILY;TZID=Europe/Paris'],
      ['INTERVAL=2'],
      ['FREQ=SOMETIMES'],
      [''],
    ])('refuses %j', (input) => {
      expect(() => normaliseRecurrence(input)).toThrow(InvalidRecurrenceError);
    });
  });

  it('recognises local date-times', () => {
    expect(isLocalDateTime('2026-03-01T09:00')).toBe(true);
    expect(isLocalDateTime('2026-02-30T09:00')).toBe(false);
    expect(isLocalDateTime('2026-03-01T24:00')).toBe(false);
    expect(isLocalDateTime('2026-03-01T09:00:00Z')).toBe(false);
  });

  it('keeps the wall-clock time across the spring and autumn DST changes', () => {
    const schedule = {
      rrule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0',
      dtstart: '2026-03-01T09:00',
      timezone: 'Europe/Paris',
    };

    // Paris leaves UTC+1 on 29 March and returns to it on 25 October 2026.
    const between = (from: string, to: string): string[] => iso(
      occurrencesBetween(schedule, new Date(from), new Date(to)),
    );

    expect(between('2026-03-20T00:00:00Z', '2026-04-01T00:00:00Z')).toEqual([
      '2026-03-23T08:00:00.000Z',
      '2026-03-30T07:00:00.000Z',
    ]);
    expect(between('2026-10-18T00:00:00Z', '2026-10-28T00:00:00Z')).toEqual([
      '2026-10-19T07:00:00.000Z',
      '2026-10-26T08:00:00.000Z',
    ]);
  });

  it('expands "every 2 days at 19:00" from its start, in the household zone', () => {
    const schedule = {
      rrule: 'FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0',
      dtstart: '2026-11-01T19:00',
      timezone: 'America/New_York',
    };

    expect(iso(nextOccurrences(schedule, new Date('2026-11-01T00:00:00Z'), 3))).toEqual([
      // 1 November is the day New York leaves daylight time: 19:00 EST is 00:00 UTC next day.
      '2026-11-02T00:00:00.000Z',
      '2026-11-04T00:00:00.000Z',
      '2026-11-06T00:00:00.000Z',
    ]);
  });

  it('moves a wall-clock time that does not exist forward by the gap', () => {
    const schedule = {
      rrule: 'FREQ=DAILY;BYHOUR=2;BYMINUTE=30',
      dtstart: '2026-03-28T02:30',
      timezone: 'Europe/Paris',
    };

    const from = new Date('2026-03-28T00:00:00Z');
    const between = iso(occurrencesBetween(schedule, from, new Date('2026-03-30T12:00:00Z')));

    expect(between).toEqual([
      '2026-03-28T01:30:00.000Z',
      '2026-03-29T01:30:00.000Z',
      '2026-03-30T00:30:00.000Z',
    ]);
  });

  it('returns the next occurrences strictly after the given instant, several per day included', () => {
    const schedule = {
      rrule: 'FREQ=DAILY;BYHOUR=8,20;BYMINUTE=0',
      dtstart: '2026-06-01T08:00',
      timezone: 'UTC',
    };

    expect(iso(nextOccurrences(schedule, new Date('2026-06-10T08:00:00Z'), 3))).toEqual([
      '2026-06-10T20:00:00.000Z',
      '2026-06-11T08:00:00.000Z',
      '2026-06-11T20:00:00.000Z',
    ]);
    expect(nextOccurrences(schedule, new Date('2026-06-10T08:00:00Z'), 0)).toEqual([]);
  });

  it('stops where a finite rule ends and never starts before dtstart', () => {
    const schedule = {
      rrule: 'FREQ=WEEKLY;COUNT=2',
      dtstart: '2026-06-01T10:00',
      timezone: 'UTC',
    };

    expect(iso(nextOccurrences(schedule, new Date('2026-01-01T00:00:00Z'), 5))).toEqual([
      '2026-06-01T10:00:00.000Z',
      '2026-06-08T10:00:00.000Z',
    ]);
    expect(hasAnyOccurrence(schedule)).toBe(true);
    expect(hasAnyOccurrence({
      ...schedule,
      rrule: 'FREQ=DAILY;UNTIL=20250101T000000Z',
    })).toBe(false);
  });
});

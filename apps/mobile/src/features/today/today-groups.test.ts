import {
  dayInZone, groupOccurrences, type HouseholdOccurrence,
} from './today-groups';

let nextId = 1;

function occurrence (scheduledFor: string, status: HouseholdOccurrence['status'] = 'PENDING'): HouseholdOccurrence {
  nextId += 1;

  return {
    id: nextId,
    routine: {
      id: 1,
      name: 'Feeding',
    },
    tank: {
      id: 2,
      name: 'Salon',
    },
    scheduledFor,
    status,
    completedAt: null,
    completedBy: null,
  };
}

describe('dayInZone', () => {
  it('reads the calendar day where the household lives', () => {
    const lateEvening = new Date('2026-11-19T23:30:00.000Z');

    expect(dayInZone(lateEvening, 'UTC')).toBe('2026-11-19');
    expect(dayInZone(lateEvening, 'Europe/Paris')).toBe('2026-11-20');
  });
});

describe('groupOccurrences', () => {
  // 19 November 2026, 14:00 in Paris.
  const now = new Date('2026-11-19T13:00:00.000Z');

  it('splits open occurrences into overdue, the rest of today and the next days', () => {
    const missed = occurrence('2026-11-18T07:00:00.000Z', 'MISSED');
    const earlier = occurrence('2026-11-19T07:00:00.000Z');
    const tonight = occurrence('2026-11-19T19:00:00.000Z');
    const lateTonight = occurrence('2026-11-19T22:30:00.000Z');
    const tomorrow = occurrence('2026-11-20T07:00:00.000Z');
    const tomorrowEvening = occurrence('2026-11-20T19:00:00.000Z');
    const saturday = occurrence('2026-11-21T09:00:00.000Z');

    const groups = groupOccurrences(
      [saturday, tomorrow, lateTonight, tonight, earlier, missed, tomorrowEvening],
      now,
      'Europe/Paris',
    );

    expect(groups.overdue).toEqual([missed, earlier]);
    expect(groups.today).toEqual([tonight, lateTonight]);
    expect(groups.upcoming).toEqual([
      {
        day: '2026-11-20',
        occurrences: [tomorrow, tomorrowEvening],
      },
      {
        day: '2026-11-21',
        occurrences: [saturday],
      },
    ]);
  });

  it('leaves out what was done or skipped', () => {
    const groups = groupOccurrences([
      occurrence('2026-11-19T07:00:00.000Z', 'DONE'),
      occurrence('2026-11-19T19:00:00.000Z', 'SKIPPED'),
    ], now, 'Europe/Paris');

    expect(groups).toEqual({
      overdue: [],
      today: [],
      upcoming: [],
    });
  });

  it('uses the household zone for the day boundary, not UTC', () => {
    // 23:30 UTC on the 19th is already the 20th in Paris.
    const groups = groupOccurrences([occurrence('2026-11-19T23:30:00.000Z')], now, 'Europe/Paris');

    expect(groups.today).toEqual([]);
    expect(groups.upcoming[0]?.day).toBe('2026-11-20');
  });
});

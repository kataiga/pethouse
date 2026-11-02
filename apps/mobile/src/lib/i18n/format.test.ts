import {
  calendarDateOf, dateFromCalendar, formatCalendarDate,
} from './format';

describe('calendar dates', () => {
  it('round-trips a local date without shifting it', () => {
    const date = dateFromCalendar('2026-01-05');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(5);
    expect(calendarDateOf(date)).toBe('2026-01-05');
  });

  it('writes the date in the language of the person', () => {
    expect(formatCalendarDate('2026-01-15', 'fr')).toBe('15 janvier 2026');
    expect(formatCalendarDate('2026-01-15', 'en')).toBe('January 15, 2026');
  });
});

import { DateTime } from 'luxon';
import {
  Frequency, Options, RRule,
} from 'rrule';

/** Local wall-clock start of a routine, in its household's time zone: `YYYY-MM-DDTHH:mm`. */
export const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Frequencies a maintenance routine may use. Anything finer would flood every member. */
const ALLOWED_FREQUENCIES: readonly Frequency[] = [
  Frequency.YEARLY,
  Frequency.MONTHLY,
  Frequency.WEEKLY,
  Frequency.DAILY,
];

const DAY_MS = 24 * 60 * 60 * 1000;

export class InvalidRecurrenceError extends Error {}

export interface Schedule {
  /** RRULE body, `FREQ=…;…`, without `DTSTART` (the routine carries its own start). */
  rrule: string;
  /** Local wall-clock start, see LOCAL_DATE_TIME_PATTERN. */
  dtstart: string;
  /** IANA time zone of the household. */
  timezone: string;
}

/**
 * Validates an RRULE and returns its canonical body (`FREQ=WEEKLY;BYDAY=MO;BYHOUR=9`), with or
 * without a leading `RRULE:`. DTSTART and TZID are refused: the start is a separate field and the
 * zone always comes from the household.
 */
export function normaliseRecurrence (input: string): string {
  // RFC 5545 is case-insensitive; the parser is not (`byday=mo` would lose its days).
  const body = input.trim().toUpperCase().replace(/^RRULE:/, '');

  if (body === '' || /[\r\n]/.test(body) || /(^|;)\s*(DTSTART|TZID)\s*=/i.test(body)) {
    throw new InvalidRecurrenceError('Expected a single RRULE without DTSTART or TZID');
  }

  let options: Partial<Options>;
  try {
    options = RRule.parseString(body);
  } catch {
    throw new InvalidRecurrenceError('Unreadable RRULE');
  }

  if (options.freq === undefined || options.freq === null) {
    throw new InvalidRecurrenceError('The RRULE needs a FREQ');
  }

  if (!ALLOWED_FREQUENCIES.includes(options.freq)) {
    throw new InvalidRecurrenceError('A routine repeats at most daily (FREQ=DAILY, WEEKLY, MONTHLY or YEARLY)');
  }

  return RRule.optionsToString(options).replace(/^RRULE:/, '');
}

export function isLocalDateTime (value: string): boolean {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));

  // Date.UTC rolls 30 February into March and 24:00 into the next day; a round trip catches both.
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute;
}

/**
 * The rule is expanded in "floating" time: wall-clock values carried in the UTC fields of a Date.
 * Each result is then placed in the household zone, which is what keeps "every Monday at 09:00"
 * at 09:00 across a DST change. A wall-clock time that does not exist (spring-forward gap) moves
 * forward by the gap, as Luxon does.
 */
function buildRule (schedule: Schedule): RRule {
  const match = LOCAL_DATE_TIME_PATTERN.exec(schedule.dtstart);

  if (!match) {
    throw new InvalidRecurrenceError('dtstart must be a local date-time, YYYY-MM-DDTHH:mm');
  }

  const [, year, month, day, hour, minute] = match.map(Number);

  return new RRule({
    ...RRule.parseString(normaliseRecurrence(schedule.rrule)),
    dtstart: new Date(Date.UTC(year, month - 1, day, hour, minute)),
    tzid: null,
  });
}

function floatingToUtc (floating: Date, timezone: string): Date {
  return DateTime.fromObject({
    year: floating.getUTCFullYear(),
    month: floating.getUTCMonth() + 1,
    day: floating.getUTCDate(),
    hour: floating.getUTCHours(),
    minute: floating.getUTCMinutes(),
  }, { zone: timezone }).toUTC().toJSDate();
}

function utcToFloating (instant: Date, timezone: string): Date {
  const local = DateTime.fromJSDate(instant, { zone: timezone });

  return new Date(Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second));
}

function uniqueSorted (instants: Date[]): Date[] {
  const seen = new Set<number>();

  return instants
    .filter((instant) => {
      const time = instant.getTime();
      if (seen.has(time)) {
        return false;
      }
      seen.add(time);

      return true;
    })
    .sort((a, b) => a.getTime() - b.getTime());
}

/** Occurrences, as UTC instants, within `[from, to]`. */
export function occurrencesBetween (schedule: Schedule, from: Date, to: Date): Date[] {
  const rule = buildRule(schedule);
  // Widened by a day on each side: zone offsets move the window edges by up to ±14 hours.
  const floatingFrom = new Date(utcToFloating(from, schedule.timezone).getTime() - DAY_MS);
  const floatingTo = new Date(utcToFloating(to, schedule.timezone).getTime() + DAY_MS);

  return uniqueSorted(rule.between(floatingFrom, floatingTo, true)
    .map((floating) => floatingToUtc(floating, schedule.timezone))
    .filter((instant) => instant >= from && instant <= to));
}

/** The next `count` occurrences strictly after `after`. */
export function nextOccurrences (schedule: Schedule, after: Date, count: number): Date[] {
  if (count <= 0) {
    return [];
  }

  const rule = buildRule(schedule);
  const floatingAfter = new Date(utcToFloating(after, schedule.timezone).getTime() - DAY_MS);
  const collected: Date[] = [];
  const seen = new Set<number>();

  // The iterator collects as it goes and stops the expansion once enough instants are found;
  // a finite rule (COUNT, UNTIL) simply ends earlier.
  rule.between(floatingAfter, new Date(Date.UTC(9999, 0, 1)), false, (floating) => {
    const instant = floatingToUtc(floating, schedule.timezone);

    if (instant > after && !seen.has(instant.getTime())) {
      seen.add(instant.getTime());
      collected.push(instant);
    }

    return collected.length < count;
  });

  return collected.sort((a, b) => a.getTime() - b.getTime());
}

/** Whether the rule ever produces an occurrence (an UNTIL before the start, for one, does not). */
export function hasAnyOccurrence (schedule: Schedule): boolean {
  return buildRule(schedule).after(new Date(Date.UTC(1, 0, 1)), true) !== null;
}

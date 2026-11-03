export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export const FREQUENCIES: readonly Frequency[] = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

export const WEEKDAYS: readonly Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

/** 1st to 4th, or the last one of the month. */
export type Ordinal = 1 | 2 | 3 | 4 | -1;

export const ORDINALS: readonly Ordinal[] = [1, 2, 3, 4, -1];

export interface TimeOfDay {
  hour: number;
  minute: number;
}

export type MonthlyRule = { kind: 'dayOfMonth';
  day: number } | { kind: 'weekdayOfMonth';
    ordinal: Ordinal;
    weekday: Weekday };

/**
 * What the editor can show and change. Anything an RRULE can say beyond this is kept as a raw
 * rule, read-only, rather than silently rewritten.
 */
export interface Recurrence {
  frequency: Frequency;
  /** Every n days, weeks, months or years. */
  interval: number;
  /** Weekly only, Monday first. */
  weekdays: Weekday[];
  /** Monthly only. */
  monthly: MonthlyRule;
  /** At least one; all share one minute, since an RRULE crosses every hour with every minute. */
  times: TimeOfDay[];
}

export const MAX_INTERVAL = 99;

export const MAX_TIMES = 6;

const pad = (value: number): string => String(value).padStart(2, '0');

export function timeText ({ hour, minute }: TimeOfDay): string {
  return `${pad(hour)}:${pad(minute)}`;
}

function isWeekday (value: string): value is Weekday {
  return WEEKDAYS.some((day) => day === value);
}

function isFrequency (value: string): value is Frequency {
  return FREQUENCIES.some((frequency) => frequency === value);
}

function isOrdinal (value: number): value is Ordinal {
  return ORDINALS.some((ordinal) => ordinal === value);
}

function numbers (text: string | undefined): number[] | null {
  if (text === undefined) {
    return [];
  }

  const parts = text.split(',');

  return parts.every((part) => /^-?\d+$/.test(part)) ? parts.map(Number) : null;
}

/** The time of a local `YYYY-MM-DDTHH:mm` start, used when the rule names no hour. */
function startTime (dtstart: string): TimeOfDay {
  const match = /T(\d{2}):(\d{2})$/.exec(dtstart);

  return {
    hour: Number(match?.[1] ?? 9),
    minute: Number(match?.[2] ?? 0),
  };
}

const SUPPORTED_KEYS = ['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY', 'BYHOUR', 'BYMINUTE', 'WKST'];

/**
 * Reads an RRULE body into the editor's model, or null when it says something the editor cannot
 * represent: then the routine keeps its rule as it is.
 */
export function parseRecurrence (rrule: string, dtstart: string): Recurrence | null {
  const parts = new Map<string, string>();

  for (const part of rrule.trim().toUpperCase().replace(/^RRULE:/, '').split(';')) {
    const [key, value] = part.split('=');

    if (key === undefined || value === undefined || !SUPPORTED_KEYS.includes(key)) {
      return null;
    }
    parts.set(key, value);
  }

  const frequency = parts.get('FREQ') ?? '';
  const interval = Number(parts.get('INTERVAL') ?? '1');
  const hours = numbers(parts.get('BYHOUR'));
  const minutes = numbers(parts.get('BYMINUTE'));
  const monthDays = numbers(parts.get('BYMONTHDAY'));
  const byDay = parts.get('BYDAY')?.split(',') ?? [];

  if (!isFrequency(frequency) || !Number.isInteger(interval) || interval < 1 || interval > MAX_INTERVAL
    || hours === null || minutes === null || monthDays === null || minutes.length > 1) {
    return null;
  }

  const fallback = startTime(dtstart);
  const minute = minutes[0] ?? fallback.minute;
  const times = (hours.length === 0 ? [fallback.hour] : hours).map((hour) => ({
    hour,
    minute,
  }));

  if (times.some((time) => time.hour < 0 || time.hour > 23) || minute < 0 || minute > 59) {
    return null;
  }

  const base: Recurrence = {
    frequency,
    interval,
    weekdays: [],
    monthly: {
      kind: 'dayOfMonth',
      day: 1,
    },
    times: [...times].sort((a, b) => a.hour - b.hour),
  };

  if (frequency === 'DAILY' || frequency === 'YEARLY') {
    return byDay.length === 0 && monthDays.length === 0 ? base : null;
  }

  if (frequency === 'WEEKLY') {
    if (monthDays.length > 0 || byDay.length === 0 || !byDay.every(isWeekday)) {
      return null;
    }

    return {
      ...base,
      weekdays: WEEKDAYS.filter((day) => byDay.some((chosen) => chosen === day)),
    };
  }

  if (monthDays.length === 1 && byDay.length === 0) {
    const day = monthDays[0] ?? 0;

    return day >= 1 && day <= 31 ? {
      ...base,
      monthly: {
        kind: 'dayOfMonth',
        day,
      },
    } : null;
  }

  const ordinalDay = byDay.length === 1 && monthDays.length === 0 ? /^(-?\d)([A-Z]{2})$/.exec(byDay[0] ?? '') : null;
  const ordinal = Number(ordinalDay?.[1]);
  const weekday = ordinalDay?.[2] ?? '';

  return ordinalDay && isOrdinal(ordinal) && isWeekday(weekday) ? {
    ...base,
    monthly: {
      kind: 'weekdayOfMonth',
      ordinal,
      weekday,
    },
  } : null;
}

export type RecurrenceError = 'noWeekday' | 'noTime' | 'mixedMinutes' | 'interval' | 'monthDay';

/** What keeps the model from being written as an RRULE, or null. */
export function recurrenceError (recurrence: Recurrence): RecurrenceError | null {
  if (!Number.isInteger(recurrence.interval) || recurrence.interval < 1 || recurrence.interval > MAX_INTERVAL) {
    return 'interval';
  }
  if (recurrence.times.length === 0) {
    return 'noTime';
  }
  if (new Set(recurrence.times.map((time) => time.minute)).size > 1) {
    return 'mixedMinutes';
  }
  if (recurrence.frequency === 'WEEKLY' && recurrence.weekdays.length === 0) {
    return 'noWeekday';
  }
  if (recurrence.frequency === 'MONTHLY' && recurrence.monthly.kind === 'dayOfMonth'
    && (recurrence.monthly.day < 1 || recurrence.monthly.day > 31)) {
    return 'monthDay';
  }

  return null;
}

/** The RRULE body for a valid model: keys in a stable order, hours and minute always explicit. */
export function buildRecurrence (recurrence: Recurrence): string {
  const parts = [`FREQ=${recurrence.frequency}`];

  if (recurrence.interval > 1) {
    parts.push(`INTERVAL=${recurrence.interval}`);
  }
  if (recurrence.frequency === 'WEEKLY') {
    parts.push(`BYDAY=${WEEKDAYS.filter((day) => recurrence.weekdays.includes(day)).join(',')}`);
  }
  if (recurrence.frequency === 'MONTHLY') {
    parts.push(recurrence.monthly.kind === 'dayOfMonth'
      ? `BYMONTHDAY=${recurrence.monthly.day}`
      : `BYDAY=${recurrence.monthly.ordinal}${recurrence.monthly.weekday}`);
  }

  const hours = [...new Set(recurrence.times.map((time) => time.hour))].sort((a, b) => a - b);
  parts.push(`BYHOUR=${hours.join(',')}`, `BYMINUTE=${recurrence.times[0]?.minute ?? 0}`);

  return parts.join(';');
}

/** The routine's local start: the chosen day at the first time of the rule. */
export function buildStart (startDate: string, recurrence: Recurrence): string {
  const first = [...recurrence.times].sort((a, b) => a.hour - b.hour || a.minute - b.minute)[0] ?? {
    hour: 9,
    minute: 0,
  };

  return `${startDate}T${timeText(first)}`;
}

/** A new rule's starting point: every day at 9:00, or every week on the start's weekday. */
export function defaultRecurrence (frequency: Frequency, start: Date): Recurrence {
  const weekday = WEEKDAYS[(start.getDay() + 6) % 7] ?? 'MO';

  return {
    frequency,
    interval: 1,
    weekdays: [weekday],
    monthly: {
      kind: 'dayOfMonth',
      day: start.getDate(),
    },
    times: [{
      hour: 9,
      minute: 0,
    }],
  };
}

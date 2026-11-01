import { ValidateIf } from 'class-validator';

export const RRULE_EXAMPLE = 'FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0';

export const RRULE_DESCRIPTION = 'RFC 5545 RRULE body, with or without `RRULE:`, without DTSTART or TZID. '
  + 'At most daily (FREQ=DAILY, WEEKLY, MONTHLY or YEARLY). Expanded in the household time zone.';

export const DTSTART_EXAMPLE = '2026-11-02T19:00';

export const DTSTART_DESCRIPTION = 'Local wall-clock start in the household time zone, `YYYY-MM-DDTHH:mm`, no offset.';

export const MIN_REMINDER_MINUTES = 5;

export const MAX_REMINDER_MINUTES = 24 * 60;

export const MAX_REMINDER_REPEATS = 10;

/** Only when the value is present and not null: null is the explicit "clear this field". */
export function Nullable (): PropertyDecorator {
  return ValidateIf((_object, value) => value !== null && value !== undefined);
}

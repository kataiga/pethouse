const pad = (value: number): string => String(value).padStart(2, '0');

/** A local date as the API's calendar dates are written: `YYYY-MM-DD`. */
export function calendarDateOf (date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today on the device's calendar. */
export function todayCalendarDate (): string {
  return calendarDateOf(new Date());
}

/** `YYYY-MM-DD` read as a local date: parsing it as an ISO instant would shift it a day west of UTC. */
export function dateFromCalendar (calendarDate: string): Date {
  const [year, month, day] = calendarDate.split('-').map(Number);

  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

const LONG_DATE: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

/** `2026-01-15` → « 15 janvier 2026 ». */
export function formatCalendarDate (calendarDate: string, language: string): string {
  return dateFromCalendar(calendarDate).toLocaleDateString(language, LONG_DATE);
}

/** An API timestamp, as the day it fell on for this device. */
export function formatInstantDate (instant: string, language: string): string {
  return new Date(instant).toLocaleDateString(language, LONG_DATE);
}

/** An API timestamp with the time of day: « 2 novembre 2026 à 08:00 ». */
export function formatInstantDateTime (instant: string, language: string): string {
  return new Date(instant).toLocaleString(language, {
    ...LONG_DATE,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** A short day for chart axes: « 2 nov. ». */
export function formatShortDate (instant: number, language: string): string {
  return new Date(instant).toLocaleDateString(language, {
    day: 'numeric',
    month: 'short',
  });
}

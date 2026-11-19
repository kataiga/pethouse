import type { Schemas } from '@pethouse/api-client';

export type HouseholdOccurrence = Schemas['HouseholdOccurrenceResponseDto'];

export interface DayGroup {
  /** `YYYY-MM-DD` in the household's zone. */
  day: string;
  occurrences: HouseholdOccurrence[];
}

export interface TodayGroups {
  overdue: HouseholdOccurrence[];
  today: HouseholdOccurrence[];
  upcoming: DayGroup[];
}

/** The calendar day an instant falls on in a zone, `YYYY-MM-DD`. */
export function dayInZone (instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

function isOpen (occurrence: HouseholdOccurrence): boolean {
  return occurrence.status === 'PENDING' || occurrence.status === 'MISSED';
}

/**
 * What is left to do, as the household lives it: anything past and still open is overdue, the
 * rest of today comes next, then the following days one by one. Done and skipped ones are gone.
 */
export function groupOccurrences (
  occurrences: readonly HouseholdOccurrence[],
  now: Date,
  timeZone: string,
): TodayGroups {
  const today = dayInZone(now, timeZone);
  const open = occurrences
    .filter(isOpen)
    .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
  const groups: TodayGroups = {
    overdue: [],
    today: [],
    upcoming: [],
  };

  for (const occurrence of open) {
    const at = new Date(occurrence.scheduledFor);
    const day = dayInZone(at, timeZone);

    if (at < now) {
      groups.overdue.push(occurrence);
    } else if (day === today) {
      groups.today.push(occurrence);
    } else {
      const last = groups.upcoming.at(-1);

      if (last?.day === day) {
        last.occurrences.push(occurrence);
      } else {
        groups.upcoming.push({
          day,
          occurrences: [occurrence],
        });
      }
    }
  }

  return groups;
}

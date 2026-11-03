import type { TFunction } from 'i18next';
import { describeRecurrence } from './describe-recurrence';
import { parseRecurrence } from './recurrence';

/** A stored rule as a sentence, or the raw rule when the editor cannot read it. */
export function ruleText (rrule: string, dtstart: string, t: TFunction, language: string): string {
  const recurrence = parseRecurrence(rrule, dtstart);

  return recurrence
    ? describeRecurrence(recurrence, dtstart.slice(0, 10), t, language)
    : t('routines.recurrence.custom', { rule: rrule });
}

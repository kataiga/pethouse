import type { Schemas } from '@pethouse/api-client';
import {
  buildRecurrence, buildStart, defaultRecurrence, parseRecurrence, type Recurrence, type RecurrenceError,
  recurrenceError,
} from './recurrence';

export type Routine = Schemas['RoutineResponseDto'];

export const REMINDER_INTERVALS = [15, 30, 60, 120, 240] as const;

export type ReminderInterval = typeof REMINDER_INTERVALS[number];

export const MAX_REMINDERS = 10;

export const NAME_MAX_LENGTH = 80;

/** The editor's model, or a rule it cannot show, kept verbatim with its own start time. */
export type RuleDraft = { kind: 'editor';
  recurrence: Recurrence } | { kind: 'custom';
    rrule: string;
    startTime: string };

export interface RoutineDraft {
  name: string;
  description: string;
  rule: RuleDraft;
  /** `YYYY-MM-DD`, in the household's calendar. */
  startDate: string;
  remind: boolean;
  reminderEvery: ReminderInterval;
  reminderMax: number;
}

function ruleFrom (rrule: string, dtstart: string): RuleDraft {
  const recurrence = parseRecurrence(rrule, dtstart);

  return recurrence
    ? {
      kind: 'editor',
      recurrence,
    }
    : {
      kind: 'custom',
      rrule,
      startTime: dtstart.slice(11, 16),
    };
}

function nearestInterval (minutes: number): ReminderInterval {
  return [...REMINDER_INTERVALS].sort((a, b) => Math.abs(a - minutes) - Math.abs(b - minutes))[0] ?? 60;
}

const NO_REMINDERS = {
  remind: false,
  reminderEvery: 60,
  reminderMax: 3,
} as const;

export function blankDraft (today: Date, startDate: string): RoutineDraft {
  return {
    name: '',
    description: '',
    rule: {
      kind: 'editor',
      recurrence: defaultRecurrence('WEEKLY', today),
    },
    startDate,
    ...NO_REMINDERS,
  };
}

/** A template's rule and texts, starting on the given day. */
export function draftFromTemplate (rrule: string, name: string, description: string, startDate: string): RoutineDraft {
  return {
    name,
    description,
    rule: ruleFrom(rrule, `${startDate}T09:00`),
    startDate,
    ...NO_REMINDERS,
  };
}

export function draftFromRoutine (routine: Routine): RoutineDraft {
  return {
    name: routine.name,
    description: routine.description ?? '',
    rule: ruleFrom(routine.rrule, routine.dtstart),
    startDate: routine.dtstart.slice(0, 10),
    remind: routine.reminderRepeatMinutes !== null,
    reminderEvery: nearestInterval(routine.reminderRepeatMinutes ?? 60),
    reminderMax: routine.reminderMaxRepeats > 0 ? routine.reminderMaxRepeats : 3,
  };
}

export interface Schedule {
  rrule: string;
  dtstart: string;
}

/** The rule and local start the API expects, or why the rule cannot be written yet. */
export function scheduleOf (draft: RoutineDraft): Schedule | { error: RecurrenceError } {
  if (draft.rule.kind === 'custom') {
    return {
      rrule: draft.rule.rrule,
      dtstart: `${draft.startDate}T${draft.rule.startTime}`,
    };
  }

  const error = recurrenceError(draft.rule.recurrence);

  return error
    ? { error }
    : {
      rrule: buildRecurrence(draft.rule.recurrence),
      dtstart: buildStart(draft.startDate, draft.rule.recurrence),
    };
}

export type RoutineBody = Schemas['CreateRoutineDto'] & Required<Pick<Schemas['CreateRoutineDto'],
  'description' | 'reminderRepeatMinutes' | 'reminderMaxRepeats'>>;

export type RoutineFormResult = { ok: true;
  body: RoutineBody } | { ok: false;
    nameRequired: boolean;
    ruleError: RecurrenceError | null };

/** Every field, so the same body creates a routine or replaces one when editing. */
export function validateRoutine (draft: RoutineDraft): RoutineFormResult {
  const name = draft.name.trim();
  const schedule = scheduleOf(draft);

  if (name === '' || 'error' in schedule) {
    return {
      ok: false,
      nameRequired: name === '',
      ruleError: 'error' in schedule ? schedule.error : null,
    };
  }

  const description = draft.description.trim();

  return {
    ok: true,
    body: {
      name,
      description: description === '' ? null : description,
      ...schedule,
      reminderRepeatMinutes: draft.remind ? draft.reminderEvery : null,
      reminderMaxRepeats: draft.remind ? Math.min(Math.max(draft.reminderMax, 1), MAX_REMINDERS) : 0,
    },
  };
}

import { defaultRecurrence } from './recurrence';
import {
  blankDraft, draftFromRoutine, draftFromTemplate, type Routine, scheduleOf, validateRoutine,
} from './routine-form';

const ROUTINE: Routine = {
  id: 7,
  name: 'Brumisation',
  description: null,
  rrule: 'FREQ=DAILY;BYHOUR=8,20;BYMINUTE=0',
  dtstart: '2026-11-02T08:00',
  timezone: 'Europe/Paris',
  isActive: true,
  reminderRepeatMinutes: 45,
  reminderMaxRepeats: 2,
  nextOccurrenceAt: null,
  createdBy: {
    id: 1,
    displayName: 'Camille',
  },
  createdAt: '2026-11-01T00:00:00.000Z',
};

describe('routine form', () => {
  it('opens a template on the chosen day with its rule in the editor', () => {
    const rrule = 'FREQ=WEEKLY;BYDAY=SA;BYHOUR=10;BYMINUTE=0';
    const draft = draftFromTemplate(rrule, 'Changement d’eau', 'Une partie', '2026-11-03');

    expect(validateRoutine(draft)).toEqual({
      ok: true,
      body: {
        name: 'Changement d’eau',
        description: 'Une partie',
        rrule: 'FREQ=WEEKLY;BYDAY=SA;BYHOUR=10;BYMINUTE=0',
        dtstart: '2026-11-03T10:00',
        reminderRepeatMinutes: null,
        reminderMaxRepeats: 0,
      },
    });
  });

  it('keeps a rule the editor cannot show, with the routine’s own start time', () => {
    const draft = draftFromRoutine({
      ...ROUTINE,
      rrule: 'FREQ=DAILY;COUNT=10;BYHOUR=7;BYMINUTE=15',
      dtstart: '2026-11-02T07:15',
    });

    expect(draft.rule.kind).toBe('custom');
    expect(scheduleOf({
      ...draft,
      startDate: '2026-11-05',
    })).toEqual({
      rrule: 'FREQ=DAILY;COUNT=10;BYHOUR=7;BYMINUTE=15',
      dtstart: '2026-11-05T07:15',
    });
  });

  it('reads reminders back, snapping an odd interval to the nearest offered one', () => {
    expect(draftFromRoutine(ROUTINE)).toMatchObject({
      remind: true,
      reminderEvery: 30,
      reminderMax: 2,
      startDate: '2026-11-02',
    });
    expect(validateRoutine(draftFromRoutine(ROUTINE))).toMatchObject({
      ok: true,
      body: {
        reminderRepeatMinutes: 30,
        reminderMaxRepeats: 2,
        description: null,
      },
    });
  });

  it('reports a missing name and a rule that cannot be written', () => {
    const draft = blankDraft(new Date(2026, 10, 2), '2026-11-02');

    expect(validateRoutine({
      ...draft,
      name: '  ',
      rule: {
        kind: 'editor',
        recurrence: {
          ...defaultRecurrence('WEEKLY', new Date(2026, 10, 2)),
          weekdays: [],
        },
      },
    })).toEqual({
      ok: false,
      nameRequired: true,
      ruleError: 'noWeekday',
    });
  });
});

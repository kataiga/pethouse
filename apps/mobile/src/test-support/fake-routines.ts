import type { Schemas } from '@pethouse/api-client';
import {
  parseRecurrence, type Recurrence, WEEKDAYS,
} from '@/features/routines/recurrence';
import {
  error, type Fields, json, number, text,
} from './fake-http';

type TankType = Schemas['TankResponseDto']['tankType'];

type Status = Schemas['OccurrenceStatus'];

const DAY_MS = 86_400_000;

/** How far ahead occurrences are planned, as the API's scheduler does. */
const WINDOW_DAYS = 30;

/**
 * The fake expands rules in UTC and says so: its routines report `UTC` as their zone, so what
 * the screens print is exactly what the tests seeded.
 */
export const FAKE_ROUTINE_ZONE = 'UTC';

export interface FakeRoutine {
  id: number;
  tankId: number;
  name: string;
  description: string | null;
  rrule: string;
  dtstart: string;
  isActive: boolean;
  reminderRepeatMinutes: number | null;
  reminderMaxRepeats: number;
  createdBy: number;
}

export interface FakeOccurrence {
  id: number;
  routineId: number;
  scheduledFor: string;
  status: Status;
  completedAt: string | null;
  completedBy: number | null;
}

export type RoutineSeed = Partial<FakeRoutine> & Pick<FakeRoutine, 'name' | 'rrule' | 'dtstart' | 'createdBy'>;

type RoutineFields = Omit<FakeRoutine, 'id' | 'tankId' | 'createdBy'>;

const FAR_AHEAD_MS = 800 * DAY_MS;

export interface RoutineHost {
  tank (tankId: number): { tankType: TankType;
    householdId: number } | null;
  isMember (householdId: number, userId: number): boolean;
  displayName (userId: number): string;
  nextId (): number;
}

const TEMPLATES: readonly { tankType: TankType;
  key: string;
  rrule: string }[] = [
  {
    tankType: 'AQUARIUM',
    key: 'water-change',
    rrule: 'FREQ=WEEKLY;BYDAY=SA;BYHOUR=10;BYMINUTE=0',
  },
  {
    tankType: 'AQUARIUM',
    key: 'feeding',
    rrule: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
  },
  {
    tankType: 'TERRARIUM',
    key: 'misting',
    rrule: 'FREQ=DAILY;BYHOUR=8,20;BYMINUTE=0',
  },
];

function utcDay (time: number): number {
  return Math.floor(time / DAY_MS) * DAY_MS;
}

/** Does this UTC day carry occurrences of the rule started on `startDay`? */
function dayMatches (recurrence: Recurrence, startDay: Date, day: Date): boolean {
  const { interval } = recurrence;
  const weekday = WEEKDAYS[(day.getUTCDay() + 6) % 7];

  switch (recurrence.frequency) {
    case 'DAILY':
      return Math.round((day.getTime() - startDay.getTime()) / DAY_MS) % interval === 0;
    case 'WEEKLY': {
      const monday = (date: Date): number => date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY_MS;
      const weeks = Math.round((monday(day) - monday(startDay)) / (7 * DAY_MS));

      return weekday !== undefined && recurrence.weekdays.includes(weekday) && weeks % interval === 0;
    }
    case 'MONTHLY': {
      const years = day.getUTCFullYear() - startDay.getUTCFullYear();
      const months = years * 12 + day.getUTCMonth() - startDay.getUTCMonth();

      if (months % interval !== 0) {
        return false;
      }

      const { monthly } = recurrence;

      if (monthly.kind === 'dayOfMonth') {
        return day.getUTCDate() === monthly.day;
      }

      const daysInMonth = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)).getUTCDate();
      const nth = monthly.ordinal === -1
        ? day.getUTCDate() + 7 > daysInMonth
        : Math.ceil(day.getUTCDate() / 7) === monthly.ordinal;

      return weekday === monthly.weekday && nth;
    }
    case 'YEARLY':
      return (day.getUTCFullYear() - startDay.getUTCFullYear()) % interval === 0
        && day.getUTCMonth() === startDay.getUTCMonth() && day.getUTCDate() === startDay.getUTCDate();
  }
}

/** Instants of the rule from its start, between two bounds, oldest first. */
export function expand (rrule: string, dtstart: string, from: number, to: number): number[] | null {
  const recurrence = parseRecurrence(rrule, dtstart);
  const start = Date.parse(`${dtstart}:00.000Z`);

  if (!recurrence || Number.isNaN(start)) {
    return null;
  }

  const startDay = new Date(utcDay(start));
  const instants: number[] = [];

  for (let time = Math.max(utcDay(from), startDay.getTime()); time <= to; time += DAY_MS) {
    if (dayMatches(recurrence, startDay, new Date(time))) {
      for (const { hour, minute } of recurrence.times) {
        const instant = time + hour * 3_600_000 + minute * 60_000;

        if (instant >= start && instant >= from && instant <= to) {
          instants.push(instant);
        }
      }
    }
  }

  return instants.sort((a, b) => a - b);
}

/**
 * Routines, their planned occurrences, completion and history. Occurrences are planned 30 days
 * ahead on create and on any schedule change, past pending ones untouched, like the scheduler.
 */
export class FakeRoutines {
  readonly routines: FakeRoutine[] = [];

  readonly occurrences: FakeOccurrence[] = [];

  constructor (private readonly host: RoutineHost) {}

  reset (): void {
    this.routines.length = 0;
    this.occurrences.length = 0;
  }

  addRoutine (tankId: number, fields: RoutineSeed): FakeRoutine {
    const routine: FakeRoutine = {
      id: this.host.nextId(),
      tankId,
      description: null,
      isActive: true,
      reminderRepeatMinutes: null,
      reminderMaxRepeats: 0,
      ...fields,
    };
    this.routines.push(routine);
    this.plan(routine);

    return routine;
  }

  addOccurrence (routine: FakeRoutine, scheduledFor: Date, status: Status, completedBy: number | null = null):
  FakeOccurrence {
    const occurrence: FakeOccurrence = {
      id: this.host.nextId(),
      routineId: routine.id,
      scheduledFor: scheduledFor.toISOString(),
      status,
      completedAt: completedBy === null ? null : scheduledFor.toISOString(),
      completedBy,
    };
    this.occurrences.push(occurrence);

    return occurrence;
  }

  route (method: string, path: string, query: URLSearchParams, fields: Fields, userId: number): Response | null {
    if (method === 'GET' && path === '/api/routine-templates') {
      const tankType = query.get('tankType');

      return json(200, TEMPLATES
        .filter((template) => tankType === null || template.tankType === tankType)
        .map((template, index) => ({
          id: index + 1,
          tankType: template.tankType,
          nameKey: `routine.${template.key}.name`,
          descriptionKey: `routine.${template.key}.description`,
          defaultRrule: template.rrule,
        })));
    }

    const act = /^\/api\/routine-occurrences\/(\d+)\/(complete|skip)$/.exec(path);

    if (act && method === 'POST') {
      return this.act(Number(act[1]), act[2] === 'complete' ? 'DONE' : 'SKIPPED', userId);
    }

    const tankPath = /^\/api\/tanks\/(\d+)\/(routines|routine-history)(?:\/(preview|\d+))?(\/occurrences)?$/.exec(path);

    if (!tankPath) {
      return null;
    }

    const tankId = Number(tankPath[1]);
    const tank = this.host.tank(tankId);

    if (!tank || !this.host.isMember(tank.householdId, userId)) {
      return error(404, 'Tank not found');
    }

    if (tankPath[2] === 'routine-history') {
      return this.history(tankId, query);
    }

    const sub = tankPath[3];

    if (sub === undefined) {
      return method === 'POST'
        ? this.create(tankId, fields, userId)
        : json(200, this.routines
          .filter((routine) => routine.tankId === tankId)
          .map((routine) => this.routineView(routine)));
    }

    if (sub === 'preview') {
      const now = Date.now();
      const instants = expand(text(fields.rrule) ?? '', text(fields.dtstart) ?? '', now, now + FAR_AHEAD_MS);

      return instants === null ? error(400, 'Unreadable RRULE') : json(200, {
        timezone: FAKE_ROUTINE_ZONE,
        occurrences: instants.slice(0, number(fields.count) ?? 5).map((instant) => new Date(instant).toISOString()),
      });
    }

    const routine = this.routines.find((candidate) => candidate.id === Number(sub) && candidate.tankId === tankId);

    if (!routine) {
      return error(404, 'Routine not found');
    }

    if (tankPath[4] !== undefined) {
      const from = Date.parse(query.get('from') ?? new Date(Date.now() - WINDOW_DAYS * DAY_MS).toISOString());
      const to = Date.parse(query.get('to') ?? new Date(Date.now() + WINDOW_DAYS * DAY_MS).toISOString());

      return json(200, this.occurrences
        .filter((occurrence) => occurrence.routineId === routine.id)
        .filter((occurrence) => {
          const time = Date.parse(occurrence.scheduledFor);

          return time >= from && time <= to;
        })
        .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
        .map((occurrence) => this.occurrenceView(occurrence)));
    }

    if (method === 'DELETE') {
      this.routines.splice(this.routines.indexOf(routine), 1);
      for (let index = this.occurrences.length - 1; index >= 0; index -= 1) {
        if (this.occurrences[index]?.routineId === routine.id) {
          this.occurrences.splice(index, 1);
        }
      }

      return json(204);
    }

    return method === 'PATCH' ? this.update(routine, fields) : json(200, this.routineView(routine));
  }

  private validate (fields: Fields, current: FakeRoutine | null): Response | RoutineFields {
    const name = 'name' in fields ? text(fields.name)?.trim() ?? '' : current?.name ?? '';
    const rrule = text(fields.rrule) ?? current?.rrule ?? '';
    const dtstart = text(fields.dtstart) ?? current?.dtstart ?? '';

    if (name === '' || name.length > 80 || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dtstart)) {
      return error(400, 'Invalid routine');
    }

    const ahead = expand(rrule, dtstart, Date.parse(`${dtstart}:00.000Z`), Date.now() + FAR_AHEAD_MS);

    // A rule the editor cannot read is beyond this fake's expansion: it trusts it, as the API would.
    if (ahead !== null && ahead.length === 0) {
      return error(400, 'The rule produces no occurrence');
    }

    return {
      name,
      description: 'description' in fields ? text(fields.description) : current?.description ?? null,
      rrule,
      dtstart,
      isActive: typeof fields.isActive === 'boolean' ? fields.isActive : current?.isActive ?? true,
      reminderRepeatMinutes: 'reminderRepeatMinutes' in fields
        ? number(fields.reminderRepeatMinutes)
        : current?.reminderRepeatMinutes ?? null,
      reminderMaxRepeats: number(fields.reminderMaxRepeats) ?? current?.reminderMaxRepeats ?? 0,
    };
  }

  private create (tankId: number, fields: Fields, userId: number): Response {
    const valid = this.validate(fields, null);

    if (valid instanceof Response) {
      return valid;
    }

    return json(201, this.routineView(this.addRoutine(tankId, {
      ...valid,
      createdBy: userId,
    })));
  }

  private update (routine: FakeRoutine, fields: Fields): Response {
    const valid = this.validate(fields, routine);

    if (valid instanceof Response) {
      return valid;
    }

    Object.assign(routine, valid);
    this.plan(routine);

    return json(200, this.routineView(routine));
  }

  /** Re-plans the pending occurrences ahead; past and closed ones stay. */
  private plan (routine: FakeRoutine): void {
    const now = Date.now();

    for (let index = this.occurrences.length - 1; index >= 0; index -= 1) {
      const occurrence = this.occurrences[index];

      const ahead = occurrence !== undefined && Date.parse(occurrence.scheduledFor) > now;

      if (ahead && occurrence.routineId === routine.id && occurrence.status === 'PENDING') {
        this.occurrences.splice(index, 1);
      }
    }

    if (!routine.isActive) {
      return;
    }

    for (const instant of expand(routine.rrule, routine.dtstart, now, now + WINDOW_DAYS * DAY_MS) ?? []) {
      this.occurrences.push({
        id: this.host.nextId(),
        routineId: routine.id,
        scheduledFor: new Date(instant).toISOString(),
        status: 'PENDING',
        completedAt: null,
        completedBy: null,
      });
    }
  }

  private act (occurrenceId: number, target: 'DONE' | 'SKIPPED', userId: number): Response {
    const occurrence = this.occurrences.find((candidate) => candidate.id === occurrenceId);
    const routine = this.routines.find((candidate) => candidate.id === occurrence?.routineId);
    const tank = routine ? this.host.tank(routine.tankId) : null;

    if (!occurrence || !tank || !this.host.isMember(tank.householdId, userId)) {
      return error(404, 'Occurrence not found');
    }

    if (occurrence.status !== target) {
      if (occurrence.status !== 'PENDING' && occurrence.status !== 'MISSED') {
        return error(409, `The occurrence is already ${occurrence.status.toLowerCase()}`);
      }
      occurrence.status = target;
      occurrence.completedAt = new Date().toISOString();
      occurrence.completedBy = userId;
    }

    return json(200, this.occurrenceView(occurrence));
  }

  private history (tankId: number, query: URLSearchParams): Response {
    const routineId = query.get('routineId');
    const page = Number(query.get('page') ?? 1);
    const limit = Number(query.get('limit') ?? 20);
    const owned = new Set(this.routines.filter((routine) => routine.tankId === tankId).map((routine) => routine.id));
    const when = (occurrence: FakeOccurrence): string => occurrence.completedAt ?? occurrence.scheduledFor;
    const rows = this.occurrences
      .filter((occurrence) => owned.has(occurrence.routineId) && occurrence.status !== 'PENDING')
      .filter((occurrence) => routineId === null || occurrence.routineId === Number(routineId))
      .sort((a, b) => when(b).localeCompare(when(a)));

    return json(200, {
      data: rows.slice((page - 1) * limit, page * limit).map((occurrence) => this.occurrenceView(occurrence)),
      total: rows.length,
      page,
      limit,
    });
  }

  private routineView (routine: FakeRoutine): Schemas['RoutineResponseDto'] {
    const next = routine.isActive
      ? expand(routine.rrule, routine.dtstart, Date.now() + 1, Date.now() + FAR_AHEAD_MS)?.[0]
      : undefined;

    return {
      id: routine.id,
      name: routine.name,
      description: routine.description,
      rrule: routine.rrule,
      dtstart: routine.dtstart,
      timezone: FAKE_ROUTINE_ZONE,
      isActive: routine.isActive,
      reminderRepeatMinutes: routine.reminderRepeatMinutes,
      reminderMaxRepeats: routine.reminderMaxRepeats,
      nextOccurrenceAt: next === undefined ? null : new Date(next).toISOString(),
      createdBy: {
        id: routine.createdBy,
        displayName: this.host.displayName(routine.createdBy),
      },
      createdAt: '2026-11-01T00:00:00.000Z',
    };
  }

  private occurrenceView (occurrence: FakeOccurrence): Schemas['OccurrenceResponseDto'] {
    const routine = this.routines.find((candidate) => candidate.id === occurrence.routineId);

    return {
      id: occurrence.id,
      routine: {
        id: occurrence.routineId,
        name: routine?.name ?? '',
      },
      scheduledFor: occurrence.scheduledFor,
      status: occurrence.status,
      completedAt: occurrence.completedAt,
      completedBy: occurrence.completedBy === null ? null : {
        id: occurrence.completedBy,
        displayName: this.host.displayName(occurrence.completedBy),
      },
    };
  }
}

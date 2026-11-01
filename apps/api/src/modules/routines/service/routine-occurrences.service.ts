import {
  BadRequestException, ConflictException, Injectable,
} from '@nestjs/common';
import { Page } from '@common/dto/paginated-response.dto';
import { RoutineQueue } from '@core/queue/routine-queue';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { OccurrenceStatus } from '../entity/occurrence-status.enum';
import { RoutineOccurrence } from '../entity/routine-occurrence.entity';
import { Routine } from '../entity/routine.entity';
import { RoutineOccurrenceRepository } from '../repository/routine-occurrence.repository';
import { occurrencesBetween } from './recurrence';

/** How far ahead occurrences exist as rows. The scheduler keeps the window rolling. */
export const MATERIALISATION_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_LIST_DAYS = 30;

const MAX_LIST_DAYS = 92;

@Injectable()
export class RoutineOccurrencesService {
  constructor (
    private readonly occurrences: RoutineOccurrenceRepository,
    private readonly queue: RoutineQueue,
  ) {}

  /**
   * Makes the rows of the coming window match the schedule: missing occurrences are inserted,
   * pending ones the rule no longer produces are deleted. Past rows and anything already done,
   * skipped or missed are never touched. Idempotent, so the scheduler may run it at will.
   */
  async reconcile (routine: Routine, timezone: string, now: Date = new Date()): Promise<void> {
    if (!routine.isActive) {
      await this.occurrences.deletePendingFrom(routine.id, now, []);

      return;
    }

    const expected = occurrencesBetween({
      rrule: routine.rrule,
      dtstart: routine.dtstart,
      timezone,
    }, now, new Date(now.getTime() + MATERIALISATION_WINDOW_DAYS * DAY_MS));

    await this.occurrences.deletePendingFrom(routine.id, now, expected);
    await this.occurrences.insertMissing(routine.id, expected);
  }

  listForRoutine (routine: Routine, from?: string, to?: string): Promise<RoutineOccurrence[]> {
    const now = Date.now();
    const start = from === undefined ? new Date(now - DEFAULT_LIST_DAYS * DAY_MS) : new Date(from);
    const end = to === undefined ? new Date(now + MATERIALISATION_WINDOW_DAYS * DAY_MS) : new Date(to);

    if (start > end) {
      throw new BadRequestException('from must be before to');
    }

    if (end.getTime() - start.getTime() > MAX_LIST_DAYS * DAY_MS) {
      throw new BadRequestException(`The range cannot exceed ${MAX_LIST_DAYS} days`);
    }

    return this.occurrences.findForRoutine(routine.id, start, end);
  }

  async history (
    tank: Tank,
    routineId: number | undefined,
    page: number,
    limit: number,
  ): Promise<Page<RoutineOccurrence>> {
    const [data, total] = await this.occurrences.findHistory(tank.id, routineId, (page - 1) * limit, limit);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  findWithHousehold (id: number): Promise<RoutineOccurrence | null> {
    return this.occurrences.findWithHousehold(id);
  }

  /**
   * Marks the occurrence done by `user`. Completing one already done is a no-op that keeps the
   * first completion (two members tapping "Done" on the same notification); a skipped one is a
   * conflict. The schedule never moves: the next occurrence comes from the RRULE.
   */
  complete (occurrence: RoutineOccurrence, user: User, now: Date = new Date()): Promise<RoutineOccurrence> {
    return this.settle(occurrence, OccurrenceStatus.DONE, user, now);
  }

  /** Same rules as complete, mirrored: skipping twice is a no-op, skipping a done one a conflict. */
  skip (occurrence: RoutineOccurrence, user: User, now: Date = new Date()): Promise<RoutineOccurrence> {
    return this.settle(occurrence, OccurrenceStatus.SKIPPED, user, now);
  }

  private async settle (
    occurrence: RoutineOccurrence,
    target: OccurrenceStatus.DONE | OccurrenceStatus.SKIPPED,
    user: User,
    now: Date,
  ): Promise<RoutineOccurrence> {
    if (occurrence.status === target) {
      return occurrence;
    }

    if (occurrence.status !== OccurrenceStatus.PENDING && occurrence.status !== OccurrenceStatus.MISSED) {
      throw new ConflictException(`The occurrence is already ${occurrence.status.toLowerCase()}`);
    }

    occurrence.status = target;
    occurrence.completedAt = now;
    occurrence.completedBy = user;
    await this.occurrences.getEntityManager().flush();
    // The only reminder that can be waiting is the next one; a running one re-checks the status.
    await this.queue.cancelNotification(occurrence.id, occurrence.remindersSent + 1);

    return occurrence;
  }
}

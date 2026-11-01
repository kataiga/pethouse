import { EntityRepository } from '@mikro-orm/mysql';
import { OccurrenceStatus } from '../entity/occurrence-status.enum';
import type { RoutineOccurrence } from '../entity/routine-occurrence.entity';

export class RoutineOccurrenceRepository extends EntityRepository<RoutineOccurrence> {
  /** Inserts the instants not materialised yet; rows already there are left untouched. */
  async insertMissing (routineId: number, instants: Date[]): Promise<void> {
    if (instants.length === 0) {
      return;
    }

    await this.createQueryBuilder()
      .insert(instants.map((scheduledFor) => ({
        routine: routineId,
        scheduledFor,
        status: OccurrenceStatus.PENDING,
        remindersSent: 0,
      })))
      .onConflict(['routine', 'scheduledFor'])
      .ignore()
      .execute();
  }

  /** Deletes pending occurrences from `from` on that are not in `keep`. Acted-on ones stay. */
  deletePendingFrom (routineId: number, from: Date, keep: Date[]): Promise<number> {
    return this.nativeDelete({
      routine: routineId,
      status: OccurrenceStatus.PENDING,
      scheduledFor: keep.length > 0
        ? {
          $gte: from,
          $nin: keep,
        }
        : { $gte: from },
    });
  }

  findForRoutine (routineId: number, from: Date, to: Date): Promise<RoutineOccurrence[]> {
    return this.find({
      routine: routineId,
      scheduledFor: {
        $gte: from,
        $lte: to,
      },
    }, {
      populate: ['routine', 'completedBy'],
      orderBy: { scheduledFor: 'asc' },
    });
  }

  /** Occurrences somebody acted on or that were missed, newest first. */
  findHistory (
    tankId: number,
    routineId: number | undefined,
    offset: number,
    limit: number,
  ): Promise<[RoutineOccurrence[], number]> {
    return this.findAndCount({
      routine: routineId === undefined
        ? { tank: tankId }
        : {
          id: routineId,
          tank: tankId,
        },
      status: { $ne: OccurrenceStatus.PENDING },
    }, {
      populate: ['routine', 'completedBy'],
      orderBy: {
        scheduledFor: 'desc',
        id: 'desc',
      },
      offset,
      limit,
    });
  }

  /** Due, not yet notified occurrences of active routines, scheduled after `since`. */
  async findDispatchable (since: Date, now: Date, limit: number): Promise<number[]> {
    const rows = await this.find({
      status: OccurrenceStatus.PENDING,
      notifiedAt: null,
      scheduledFor: {
        $gt: since,
        $lte: now,
      },
      routine: { isActive: true },
    }, {
      fields: ['id'],
      orderBy: { scheduledFor: 'asc' },
      limit,
    });

    return rows.map((row) => row.id);
  }

  /** Claims the due notification; true for exactly one caller, whatever the number of replicas. */
  async claimNotification (id: number, now: Date): Promise<boolean> {
    const affected = await this.nativeUpdate({
      id,
      status: OccurrenceStatus.PENDING,
      notifiedAt: null,
    }, { notifiedAt: now });

    return affected === 1;
  }

  /** Claims reminder number `attempt` (1-based) while the occurrence is still pending. */
  async claimReminder (id: number, attempt: number): Promise<boolean> {
    const affected = await this.nativeUpdate({
      id,
      status: OccurrenceStatus.PENDING,
      remindersSent: attempt - 1,
    }, { remindersSent: attempt });

    return affected === 1;
  }

  /**
   * Flips to MISSED every pending occurrence whose window has passed: a later occurrence of the
   * same routine is already due, or the routine was deactivated. Returns how many flipped.
   */
  async markMissed (now: Date): Promise<number> {
    // MySQL refuses to update a table read in a subquery unless the read is materialised first.
    const result = await this.getEntityManager().getConnection().execute<{ affectedRows: number }>(
      `UPDATE routine_occurrences
       SET status = ?
       WHERE status = ? AND id IN (
         SELECT id FROM (
           SELECT o.id
           FROM routine_occurrences o
           JOIN routines r ON r.id = o.routine_id
           WHERE o.status = ? AND o.scheduled_for < ? AND (
             r.is_active = 0 OR EXISTS (
               SELECT 1 FROM routine_occurrences n
               WHERE n.routine_id = o.routine_id AND n.scheduled_for > o.scheduled_for AND n.scheduled_for <= ?
             )
           )
         ) AS overdue
       )`,
      [OccurrenceStatus.MISSED, OccurrenceStatus.PENDING, OccurrenceStatus.PENDING, now, now],
      'run',
    );

    return result.affectedRows;
  }

  findWithHousehold (id: number): Promise<RoutineOccurrence | null> {
    return this.findOne({ id }, { populate: ['routine.tank.household', 'completedBy'] });
  }
}

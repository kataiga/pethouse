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

  findWithHousehold (id: number): Promise<RoutineOccurrence | null> {
    return this.findOne({ id }, { populate: ['routine.tank.household', 'completedBy'] });
  }
}

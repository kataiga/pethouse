import { EntityRepository } from '@mikro-orm/mysql';
import type { Routine } from '../entity/routine.entity';

export class RoutineRepository extends EntityRepository<Routine> {
  findAllForTank (tankId: number): Promise<Routine[]> {
    return this.find({ tank: tankId }, {
      populate: ['createdBy'],
      orderBy: {
        createdAt: 'asc',
        id: 'asc',
      },
    });
  }

  findInTank (tankId: number, id: number): Promise<Routine | null> {
    return this.findOne({
      id,
      tank: tankId,
    }, { populate: ['createdBy'] });
  }
}

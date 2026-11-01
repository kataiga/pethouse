import { EntityRepository } from '@mikro-orm/mysql';
import type { Tank } from '../entity/tank.entity';

export class TankRepository extends EntityRepository<Tank> {
  findAllForHousehold (householdId: number): Promise<Tank[]> {
    return this.find({ household: householdId }, {
      populate: ['subtype', 'coverPhoto'],
      orderBy: { createdAt: 'asc' },
    });
  }

  findWithHousehold (id: number): Promise<Tank | null> {
    return this.findOne({ id }, { populate: ['household', 'subtype', 'coverPhoto'] });
  }
}

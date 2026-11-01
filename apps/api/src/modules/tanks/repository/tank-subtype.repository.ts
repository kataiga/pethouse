import { EntityRepository } from '@mikro-orm/mysql';
import { TankType } from '@common/enums/tank-type.enum';
import type { TankSubtype } from '../entity/tank-subtype.entity';

export class TankSubtypeRepository extends EntityRepository<TankSubtype> {
  /** System subtypes plus the custom ones of the given households, optionally for one tank type. */
  findVisible (householdIds: number[], tankType?: TankType): Promise<TankSubtype[]> {
    return this.find({
      ...(tankType ? { tankType } : {}),
      $or: [
        { household: null },
        { household: { $in: householdIds } },
      ],
    }, {
      orderBy: {
        tankType: 'asc',
        isSystem: 'desc',
        name: 'asc',
      },
    });
  }

  /** A subtype usable by a household: system, or custom and owned by it. */
  findUsable (id: number, householdId: number): Promise<TankSubtype | null> {
    return this.findOne({
      id,
      $or: [
        { household: null },
        { household: householdId },
      ],
    });
  }
}

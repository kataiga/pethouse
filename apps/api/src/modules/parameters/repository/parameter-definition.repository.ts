import { EntityRepository } from '@mikro-orm/mysql';
import type { ParameterDefinition } from '../entity/parameter-definition.entity';

export class ParameterDefinitionRepository extends EntityRepository<ParameterDefinition> {
  /** System definitions plus the custom ones of the given households. */
  findVisible (householdIds: number[]): Promise<ParameterDefinition[]> {
    return this.find({
      $or: [
        { household: null },
        { household: { $in: householdIds } },
      ],
    }, {
      orderBy: {
        isSystem: 'desc',
        name: 'asc',
      },
    });
  }

  /** A definition usable for a household's tanks: system, or custom and owned by it. */
  findUsable (id: number, householdId: number): Promise<ParameterDefinition | null> {
    return this.findOne({
      id,
      $or: [
        { household: null },
        { household: householdId },
      ],
    });
  }
}

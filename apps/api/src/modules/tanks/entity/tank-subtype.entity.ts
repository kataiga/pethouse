import {
  Entity, EntityRepositoryType, Enum, ManyToOne, Opt, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
import { TankType } from '@common/enums/tank-type.enum';
import { Household } from '@modules/households/entity/household.entity';
import { TankSubtypeRepository } from '../repository/tank-subtype.repository';

/**
 * A refinement of a tank type: `planted`, `reef`, `desert`... System rows (no household) are
 * seeded; a household can add its own, scoped to it. Tanks always reference a real row, never a
 * free-text column.
 */
@Entity({
  tableName: 'tank_subtypes',
  repository: () => TankSubtypeRepository,
})
@Unique({ properties: ['tankType', 'slug', 'household'] })
export class TankSubtype {
  [EntityRepositoryType]?: TankSubtypeRepository;

  @PrimaryKey()
  id!: number;

  @Enum(() => TankType)
  tankType!: TankType;

  /** Stable key. The app translates system subtypes by slug; custom ones display `name`. */
  @Property({ length: 40 })
  slug!: string;

  @Property({ length: 60 })
  name!: string;

  @Property()
  isSystem!: boolean;

  @ManyToOne(() => Household, {
    nullable: true,
    deleteRule: 'cascade',
  })
  household?: Household | null = null;

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();
}

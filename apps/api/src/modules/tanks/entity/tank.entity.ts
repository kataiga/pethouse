import {
  Entity, EntityRepositoryType, Enum, ManyToOne, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { TankType } from '@common/enums/tank-type.enum';
import { Household } from '@modules/households/entity/household.entity';
import { TankRepository } from '../repository/tank.repository';
import { TankSubtype } from './tank-subtype.entity';

@Entity({
  tableName: 'tanks',
  repository: () => TankRepository,
})
export class Tank {
  [EntityRepositoryType]?: TankRepository;

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Household, { deleteRule: 'cascade' })
  household!: Household;

  @Property({ length: 80 })
  name!: string;

  @Enum(() => TankType)
  tankType!: TankType;

  @ManyToOne(() => TankSubtype, {
    nullable: true,
    deleteRule: 'set null',
  })
  subtype?: TankSubtype | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  volumeLiters?: number | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  widthCm?: number | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  heightCm?: number | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  depthCm?: number | null = null;

  @Property({
    length: 120,
    nullable: true,
  })
  substrate?: string | null = null;

  /** Calendar date (`YYYY-MM-DD`), no time: when the tank was started. */
  @Property({
    type: 'date',
    nullable: true,
  })
  startedAt?: string | null = null;

  @Property({
    type: 'text',
    nullable: true,
  })
  description?: string | null = null;

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();

  @Property({
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt: Date & Opt = new Date();
}

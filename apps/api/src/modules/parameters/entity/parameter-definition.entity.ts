import {
  Entity, EntityRepositoryType, ManyToOne, Opt, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
import { Household } from '@modules/households/entity/household.entity';
import { ParameterDefinitionRepository } from '../repository/parameter-definition.repository';

/** A measurable quantity: pH, nitrite, humidity... System rows are seeded; households add theirs. */
@Entity({
  tableName: 'parameter_definitions',
  repository: () => ParameterDefinitionRepository,
})
@Unique({ properties: ['slug', 'household'] })
export class ParameterDefinition {
  [EntityRepositoryType]?: ParameterDefinitionRepository;

  @PrimaryKey()
  id!: number;

  /** Stable key. The app translates system definitions by slug; custom ones display `name`. */
  @Property({ length: 40 })
  slug!: string;

  @Property({ length: 60 })
  name!: string;

  @Property({ length: 16 })
  unit!: string;

  /** Decimals the app shows and the input accepts. */
  @Property({ unsigned: true })
  decimals!: number;

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

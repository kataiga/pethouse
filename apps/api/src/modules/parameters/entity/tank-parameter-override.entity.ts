import {
  Entity, ManyToOne, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { ParameterDefinition } from './parameter-definition.entity';

/**
 * Where one tank deviates from the account default. A row exists only for a deviation, and
 * inside it a null field means "inherit that one", so changing the account default still
 * reaches every tank that never touched it.
 */
@Entity({ tableName: 'tank_parameter_overrides' })
@Unique({ properties: ['tank', 'definition'] })
export class TankParameterOverride {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Tank, { deleteRule: 'cascade' })
  tank!: Tank;

  @ManyToOne(() => ParameterDefinition, {
    deleteRule: 'cascade',
    fieldName: 'parameter_definition_id',
  })
  definition!: ParameterDefinition;

  @Property({ nullable: true })
  enabled?: boolean | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  minThreshold?: number | null = null;

  @Property({
    type: 'double',
    nullable: true,
  })
  maxThreshold?: number | null = null;

  /** An override with nothing left to say should not exist. */
  isEmpty (): boolean {
    return (this.enabled ?? null) === null
      && (this.minThreshold ?? null) === null
      && (this.maxThreshold ?? null) === null;
  }
}

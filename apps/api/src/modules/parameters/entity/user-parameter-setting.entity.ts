import {
  Entity, Enum, ManyToOne, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
import { TankType } from '@common/enums/tank-type.enum';
import { User } from '@modules/users/entity/user.entity';
import { ParameterDefinition } from './parameter-definition.entity';

/**
 * The account-level default for one parameter and one tank type: what every tank of that type
 * inherits. Absent row = the seeded default for that type.
 */
@Entity({ tableName: 'user_parameter_settings' })
@Unique({ properties: ['user', 'tankType', 'definition'] })
export class UserParameterSetting {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Enum(() => TankType)
  tankType!: TankType;

  @ManyToOne(() => ParameterDefinition, {
    deleteRule: 'cascade',
    fieldName: 'parameter_definition_id',
  })
  definition!: ParameterDefinition;

  @Property()
  enabled!: boolean;

  @Property({ unsigned: true })
  displayOrder!: number;

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
}

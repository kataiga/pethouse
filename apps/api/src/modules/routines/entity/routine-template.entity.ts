import {
  Entity, Enum, Opt, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
import { TankType } from '@common/enums/tank-type.enum';

/**
 * A routine suggested when a tank of this type is created. Names and descriptions are i18n keys
 * the app translates; the RRULE is a default the user adjusts before saving a real routine.
 */
@Entity({ tableName: 'routine_templates' })
@Unique({ properties: ['tankType', 'nameKey'] })
export class RoutineTemplate {
  @PrimaryKey()
  id!: number;

  @Enum(() => TankType)
  tankType!: TankType;

  @Property({ length: 120 })
  nameKey!: string;

  @Property({ length: 120 })
  descriptionKey!: string;

  @Property({ length: 255 })
  defaultRrule!: string;

  @Property()
  isSystem: boolean & Opt = true;

  @Property()
  position: number & Opt = 0;
}

import {
  Entity, EntityRepositoryType, Index, ManyToOne, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { MeasurementRepository } from '../repository/measurement.repository';
import { ParameterDefinition } from './parameter-definition.entity';

/** One reading of one parameter on one tank. The raw value is kept; the app rounds for display. */
@Entity({
  tableName: 'measurements',
  repository: () => MeasurementRepository,
})
@Index({ properties: ['tank', 'definition', 'measuredAt'] })
export class Measurement {
  [EntityRepositoryType]?: MeasurementRepository;

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Tank, { deleteRule: 'cascade' })
  tank!: Tank;

  @ManyToOne(() => ParameterDefinition, {
    deleteRule: 'cascade',
    fieldName: 'parameter_definition_id',
  })
  definition!: ParameterDefinition;

  @Property({ type: 'double' })
  value!: number;

  @Property()
  measuredAt!: Date;

  @ManyToOne(() => User)
  recordedBy!: User;

  @Property({
    length: 500,
    nullable: true,
  })
  note?: string | null = null;

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();
}

import {
  Entity, EntityRepositoryType, ManyToOne, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { RoutineRepository } from '../repository/routine.repository';

/**
 * A recurring task on a tank. `dtstart` is a **local wall-clock** start (`YYYY-MM-DDTHH:mm`) in the
 * household's time zone, not an instant: the zone is applied at expansion time, so a household
 * changing zone keeps "09:00" at 09:00. Occurrences are stored as UTC instants.
 */
@Entity({
  tableName: 'routines',
  repository: () => RoutineRepository,
})
export class Routine {
  [EntityRepositoryType]?: RoutineRepository;

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Tank, { deleteRule: 'cascade' })
  tank!: Tank;

  @Property({ length: 120 })
  name!: string;

  @Property({
    length: 500,
    nullable: true,
  })
  description?: string | null = null;

  /** RRULE body without DTSTART, e.g. `FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0`. */
  @Property({ length: 255 })
  rrule!: string;

  @Property({ length: 16 })
  dtstart!: string;

  @Property()
  isActive: boolean & Opt = true;

  @ManyToOne(() => User)
  createdBy!: User;

  /** Minutes between reminders while nobody acts; null disables the escalation. */
  @Property({
    unsigned: true,
    nullable: true,
  })
  reminderRepeatMinutes?: number | null = null;

  @Property({ unsigned: true })
  reminderMaxRepeats: number & Opt = 0;

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();

  @Property({
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt: Date & Opt = new Date();
}

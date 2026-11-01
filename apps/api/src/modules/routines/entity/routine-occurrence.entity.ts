import {
  Entity, EntityRepositoryType, Enum, Index, ManyToOne, Opt, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
import { User } from '@modules/users/entity/user.entity';
import { RoutineOccurrenceRepository } from '../repository/routine-occurrence.repository';
import { OccurrenceStatus } from './occurrence-status.enum';
import { Routine } from './routine.entity';

/**
 * One due date of a routine, materialised ahead of time from its RRULE. The unique key makes
 * materialisation idempotent; completion never moves the schedule.
 */
@Entity({
  tableName: 'routine_occurrences',
  repository: () => RoutineOccurrenceRepository,
})
@Unique({ properties: ['routine', 'scheduledFor'] })
@Index({ properties: ['status', 'scheduledFor'] })
export class RoutineOccurrence {
  [EntityRepositoryType]?: RoutineOccurrenceRepository;

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Routine, { deleteRule: 'cascade' })
  routine!: Routine;

  /** UTC instant. */
  @Property()
  scheduledFor!: Date;

  @Enum(() => OccurrenceStatus)
  status: OccurrenceStatus & Opt = OccurrenceStatus.PENDING;

  @Property({ nullable: true })
  completedAt?: Date | null = null;

  @ManyToOne(() => User, { nullable: true })
  completedBy?: User | null = null;

  /** When the due notification was claimed for sending; set once, atomically, by one replica. */
  @Property({ nullable: true })
  notifiedAt?: Date | null = null;

  /** Reminders sent after the due notification; each one is claimed atomically as well. */
  @Property({ unsigned: true })
  remindersSent: number & Opt = 0;
}

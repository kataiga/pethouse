import {
  Entity, EntityRepositoryType, Enum, Index, ManyToOne, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
import { RoutineOccurrence } from '@modules/routines/entity/routine-occurrence.entity';
import { User } from '@modules/users/entity/user.entity';
import { NotificationDeliveryRepository } from '../repository/notification-delivery.repository';
import { DeviceToken } from './device-token.entity';
import { ReceiptStatus } from './receipt-status.enum';

/**
 * One push sent to one device for one notification of an occurrence. Expo answers a send with a
 * ticket; the receipt, polled later, says whether the device really got it. The unique key lets a
 * retried job skip the devices it already reached.
 */
@Entity({
  tableName: 'notification_deliveries',
  repository: () => NotificationDeliveryRepository,
})
@Unique({ properties: ['occurrence', 'deviceToken', 'attempt'] })
@Index({ properties: ['expoReceiptStatus', 'sentAt'] })
export class NotificationDelivery {
  [EntityRepositoryType]?: NotificationDeliveryRepository;

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => RoutineOccurrence, { deleteRule: 'cascade' })
  occurrence!: RoutineOccurrence;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @ManyToOne(() => DeviceToken, { deleteRule: 'cascade' })
  deviceToken!: DeviceToken;

  /** 0 for the due notification, n for the n-th reminder. */
  @Property({ unsigned: true })
  attempt!: number;

  @Property()
  sentAt!: Date;

  /** Null when Expo refused the message outright; `error` then says why. */
  @Property({
    length: 64,
    nullable: true,
  })
  expoTicketId?: string | null = null;

  @Enum({
    items: () => ReceiptStatus,
    nullable: true,
  })
  expoReceiptStatus?: ReceiptStatus | null = null;

  @Property({
    length: 255,
    nullable: true,
  })
  error?: string | null = null;
}

import { EntityRepository } from '@mikro-orm/mysql';
import type { NotificationDelivery } from '../entity/notification-delivery.entity';
import { ReceiptStatus } from '../entity/receipt-status.enum';

export class NotificationDeliveryRepository extends EntityRepository<NotificationDelivery> {
  /** Device ids this notification already reached; a retried job skips them. */
  async deliveredDeviceIds (occurrenceId: number, attempt: number): Promise<Set<number>> {
    const rows = await this.find({
      occurrence: occurrenceId,
      attempt,
    }, { fields: ['deviceToken'] });

    return new Set(rows.map((row) => row.deviceToken.id));
  }

  /** Tickets old enough for Expo to have a receipt and young enough for it to still exist. */
  findAwaitingReceipts (sentAfter: Date, sentBefore: Date, limit: number): Promise<NotificationDelivery[]> {
    return this.find({
      expoReceiptStatus: null,
      expoTicketId: { $ne: null },
      sentAt: {
        $gt: sentAfter,
        $lte: sentBefore,
      },
    }, {
      orderBy: { sentAt: 'asc' },
      limit,
    });
  }

  /** Marks EXPIRED the tickets whose receipt can no longer be fetched. Returns how many. */
  expireUnanswered (sentBefore: Date): Promise<number> {
    return this.nativeUpdate({
      expoReceiptStatus: null,
      expoTicketId: { $ne: null },
      sentAt: { $lte: sentBefore },
    }, { expoReceiptStatus: ReceiptStatus.EXPIRED });
  }
}

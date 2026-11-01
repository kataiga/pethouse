import {
  Injectable, Logger,
} from '@nestjs/common';
import { RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/mysql';
import { ExpoPushClient } from '@core/push/expo-push.client';
import { DEVICE_NOT_REGISTERED } from '@core/push/expo-push.types';
import { ReceiptStatus } from '../entity/receipt-status.enum';
import { DeviceTokenRepository } from '../repository/device-token.repository';
import { NotificationDeliveryRepository } from '../repository/notification-delivery.repository';

/** Expo advises reading receipts about 15 minutes after the send. */
export const RECEIPT_DELAY_MS = 15 * 60 * 1000;

/** Expo forgets receipts after a day. */
export const RECEIPT_RETENTION_MS = 24 * 60 * 60 * 1000;

const RECEIPT_BATCH = 1000;

export interface ReceiptPollResult {
  checked: number;
  failed: number;
  revoked: number;
  expired: number;
}

/**
 * Second half of the Expo Push protocol: fetch the receipts of recent tickets, record them, and
 * revoke every token Expo reports as unregistered so the next sends skip it.
 */
@Injectable()
export class PushReceiptsService {
  private readonly logger = new Logger(PushReceiptsService.name);

  constructor (
    private readonly em: EntityManager,
    private readonly push: ExpoPushClient,
    private readonly deliveries: NotificationDeliveryRepository,
    private readonly devices: DeviceTokenRepository,
  ) {}

  poll (now: Date = new Date()): Promise<ReceiptPollResult> {
    return RequestContext.create(this.em, () => this.pollInContext(now));
  }

  private async pollInContext (now: Date): Promise<ReceiptPollResult> {
    const oldest = new Date(now.getTime() - RECEIPT_RETENTION_MS);
    const expired = await this.deliveries.expireUnanswered(oldest);
    const ready = new Date(now.getTime() - RECEIPT_DELAY_MS);
    const awaiting = await this.deliveries.findAwaitingReceipts(oldest, ready, RECEIPT_BATCH);
    const ticketIds = awaiting.flatMap((delivery) => delivery.expoTicketId ?? []);
    const receipts = ticketIds.length > 0 ? await this.push.getReceipts(ticketIds) : new Map();
    const unregistered = new Set<number>();
    let checked = 0;
    let failed = 0;

    for (const delivery of awaiting) {
      const receipt = receipts.get(delivery.expoTicketId ?? '');

      if (!receipt) {
        // Not ready yet: polled again next time, until it expires.
        continue;
      }

      checked += 1;

      if (receipt.status === 'ok') {
        delivery.expoReceiptStatus = ReceiptStatus.OK;
      } else {
        failed += 1;
        delivery.expoReceiptStatus = ReceiptStatus.ERROR;
        delivery.error = (receipt.errorCode ?? receipt.message).slice(0, 255);

        if (receipt.errorCode === DEVICE_NOT_REGISTERED) {
          unregistered.add(delivery.deviceToken.id);
        }
      }
    }

    await this.em.flush();
    await this.devices.revokeTokenIds([...unregistered], now);

    if (failed > 0 || expired > 0) {
      this.logger.log(`Receipts: ${failed} failed, ${unregistered.size} token(s) revoked, ${expired} expired`);
    }

    return {
      checked,
      failed,
      revoked: unregistered.size,
      expired,
    };
  }
}

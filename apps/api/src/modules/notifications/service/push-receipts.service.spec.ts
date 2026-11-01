import { EntityManager } from '@mikro-orm/mysql';
import { ExpoPushClient } from '@core/push/expo-push.client';
import { DeviceToken } from '../entity/device-token.entity';
import { NotificationDelivery } from '../entity/notification-delivery.entity';
import { ReceiptStatus } from '../entity/receipt-status.enum';
import { DeviceTokenRepository } from '../repository/device-token.repository';
import { NotificationDeliveryRepository } from '../repository/notification-delivery.repository';
import {
  PushReceiptsService, RECEIPT_DELAY_MS, RECEIPT_RETENTION_MS,
} from './push-receipts.service';

describe('PushReceiptsService', () => {
  const em = {
    flush: jest.fn(),
    fork: jest.fn(),
  };
  const push = { getReceipts: jest.fn() };
  const deliveries = {
    expireUnanswered: jest.fn(),
    findAwaitingReceipts: jest.fn(),
  };
  const devices = { revokeTokenIds: jest.fn() };
  const now = new Date('2026-11-02T12:00:00Z');
  let service: PushReceiptsService;

  function delivery (id: number, ticket: string, deviceId: number): NotificationDelivery {
    return Object.assign(new NotificationDelivery(), {
      id,
      expoTicketId: ticket,
      deviceToken: Object.assign(new DeviceToken(), { id: deviceId }),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    em.fork.mockReturnValue(em);
    deliveries.expireUnanswered.mockResolvedValue(0);
    service = new PushReceiptsService(
      em as unknown as EntityManager,
      push as unknown as ExpoPushClient,
      deliveries as unknown as NotificationDeliveryRepository,
      devices as unknown as DeviceTokenRepository,
    );
  });

  it('records receipts, revokes unregistered tokens and leaves unanswered tickets for later', async () => {
    const ok = delivery(1, 't-1', 10);
    const gone = delivery(2, 't-2', 11);
    const later = delivery(3, 't-3', 12);
    deliveries.findAwaitingReceipts.mockResolvedValue([ok, gone, later]);
    push.getReceipts.mockResolvedValue(new Map([
      ['t-1', { status: 'ok' }],
      ['t-2', {
        status: 'error',
        message: 'not registered',
        errorCode: 'DeviceNotRegistered',
      }],
    ]));

    const result = await service.poll(now);

    expect(deliveries.expireUnanswered).toHaveBeenCalledWith(new Date(now.getTime() - RECEIPT_RETENTION_MS));
    expect(deliveries.findAwaitingReceipts).toHaveBeenCalledWith(
      new Date(now.getTime() - RECEIPT_RETENTION_MS),
      new Date(now.getTime() - RECEIPT_DELAY_MS),
      expect.any(Number),
    );
    expect(push.getReceipts).toHaveBeenCalledWith(['t-1', 't-2', 't-3']);
    expect(ok.expoReceiptStatus).toBe(ReceiptStatus.OK);
    expect(gone).toMatchObject({
      expoReceiptStatus: ReceiptStatus.ERROR,
      error: 'DeviceNotRegistered',
    });
    expect(later.expoReceiptStatus).toBeNull();
    expect(devices.revokeTokenIds).toHaveBeenCalledWith([11], now);
    expect(result).toEqual({
      checked: 2,
      failed: 1,
      revoked: 1,
      expired: 0,
    });
  });

  it('does not call Expo when nothing awaits a receipt', async () => {
    deliveries.findAwaitingReceipts.mockResolvedValue([]);

    await service.poll(now);

    expect(push.getReceipts).not.toHaveBeenCalled();
  });
});

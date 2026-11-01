import {
  Injectable, Logger,
} from '@nestjs/common';
import { ExpoPushClient } from '@core/push/expo-push.client';
import {
  DEVICE_NOT_REGISTERED, ExpoPushMessage,
} from '@core/push/expo-push.types';
import { HouseholdsService } from '@modules/households/service/households.service';
import type { RoutineOccurrence } from '@modules/routines/entity/routine-occurrence.entity';
import { DeviceToken } from '../entity/device-token.entity';
import { NotificationDeliveryRepository } from '../repository/notification-delivery.repository';
import { DeviceTokenRepository } from '../repository/device-token.repository';
import {
  notificationContent, ROUTINE_NOTIFICATION_CATEGORY, ROUTINE_NOTIFICATION_CHANNEL,
} from './notification-content';
import { NotificationSender } from './notification-sender';

/**
 * Fans a notification out to every active device of every member of the household, each in its
 * owner's language. Every message is recorded with its Expo ticket; a token Expo already reports
 * as unregistered is revoked on the spot, the others are checked when receipts are polled.
 */
@Injectable()
export class ExpoNotificationSender extends NotificationSender {
  private readonly logger = new Logger(ExpoNotificationSender.name);

  constructor (
    private readonly push: ExpoPushClient,
    private readonly householdsService: HouseholdsService,
    private readonly devices: DeviceTokenRepository,
    private readonly deliveries: NotificationDeliveryRepository,
  ) {
    super();
  }

  async notifyOccurrence (occurrence: RoutineOccurrence, attempt: number): Promise<void> {
    const { routine } = occurrence;
    const { tank } = routine;
    const members = await this.householdsService.listMembers(tank.household);
    const reached = await this.deliveries.deliveredDeviceIds(occurrence.id, attempt);
    const targets = (await this.devices.findActiveForUsers(members.map((member) => member.user.id)))
      .filter((device) => !reached.has(device.id));

    if (targets.length === 0) {
      return;
    }

    const messages = targets.map((device): ExpoPushMessage => {
      const content = notificationContent({
        occurrenceId: occurrence.id,
        routineId: routine.id,
        routineName: routine.name,
        tankId: tank.id,
        tankName: tank.name,
      }, attempt, device.user.preferredLanguage);

      return {
        to: device.expoPushToken,
        ...content,
        sound: 'default',
        priority: 'high',
        categoryId: ROUTINE_NOTIFICATION_CATEGORY,
        channelId: ROUTINE_NOTIFICATION_CHANNEL,
      };
    });
    const tickets = await this.push.send(messages);
    const now = new Date();
    const unregistered: DeviceToken[] = [];
    const em = this.deliveries.getEntityManager();

    tickets.forEach((ticket, index) => {
      const device = targets[index];
      em.persist(this.deliveries.create({
        occurrence,
        user: device.user,
        deviceToken: device,
        attempt,
        sentAt: now,
        expoTicketId: ticket.status === 'ok' ? ticket.id : null,
        error: ticket.status === 'error' ? (ticket.errorCode ?? ticket.message).slice(0, 255) : null,
      }));

      if (ticket.status === 'error' && ticket.errorCode === DEVICE_NOT_REGISTERED) {
        unregistered.push(device);
      }
    });

    await em.flush();
    await this.devices.revokeTokenIds(unregistered.map((device) => device.id), now);

    if (unregistered.length > 0) {
      this.logger.log(`Revoked ${unregistered.length} unregistered device token(s)`);
    }
  }
}

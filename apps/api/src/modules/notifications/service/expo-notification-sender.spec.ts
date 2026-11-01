import { Language } from '@common/enums/language.enum';
import { ExpoPushClient } from '@core/push/expo-push.client';
import { Household } from '@modules/households/entity/household.entity';
import { HouseholdMember } from '@modules/households/entity/household-member.entity';
import { HouseholdsService } from '@modules/households/service/households.service';
import { RoutineOccurrence } from '@modules/routines/entity/routine-occurrence.entity';
import { Routine } from '@modules/routines/entity/routine.entity';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { DevicePlatform } from '../entity/device-platform.enum';
import { DeviceToken } from '../entity/device-token.entity';
import { NotificationDelivery } from '../entity/notification-delivery.entity';
import { DeviceTokenRepository } from '../repository/device-token.repository';
import { NotificationDeliveryRepository } from '../repository/notification-delivery.repository';
import { ExpoNotificationSender } from './expo-notification-sender';

describe('ExpoNotificationSender', () => {
  const alex = Object.assign(new User(), {
    id: 1,
    preferredLanguage: Language.FR,
  });
  const sam = Object.assign(new User(), {
    id: 2,
    preferredLanguage: Language.EN,
  });
  const household = Object.assign(new Household(), { id: 3 });
  const occurrence = Object.assign(new RoutineOccurrence(), {
    id: 311,
    routine: Object.assign(new Routine(), {
      id: 7,
      name: 'Water change',
      tank: Object.assign(new Tank(), {
        id: 42,
        name: 'Living room',
        household,
      }),
    }),
  });
  const device = (id: number, user: User): DeviceToken => Object.assign(new DeviceToken(), {
    id,
    user,
    expoPushToken: `ExponentPushToken[device-${id}]`,
    platform: DevicePlatform.ANDROID,
  });
  const em = {
    persist: jest.fn(),
    flush: jest.fn(),
  };
  const push = { send: jest.fn() };
  const householdsService = { listMembers: jest.fn() };
  const devices = {
    findActiveForUsers: jest.fn(),
    revokeTokenIds: jest.fn(),
  };
  const deliveries = {
    deliveredDeviceIds: jest.fn(),
    create: jest.fn((data: Partial<NotificationDelivery>) => Object.assign(new NotificationDelivery(), data)),
    getEntityManager: () => em,
  };
  let sender: ExpoNotificationSender;

  beforeEach(() => {
    jest.clearAllMocks();
    householdsService.listMembers.mockResolvedValue([
      Object.assign(new HouseholdMember(), { user: alex }),
      Object.assign(new HouseholdMember(), { user: sam }),
    ]);
    deliveries.deliveredDeviceIds.mockResolvedValue(new Set<number>());
    sender = new ExpoNotificationSender(
      push as unknown as ExpoPushClient,
      householdsService as unknown as HouseholdsService,
      devices as unknown as DeviceTokenRepository,
      deliveries as unknown as NotificationDeliveryRepository,
    );
  });

  it('sends one message per device of every member, each in its owner language, and records the tickets', async () => {
    devices.findActiveForUsers.mockResolvedValue([device(10, alex), device(11, sam), device(12, sam)]);
    push.send.mockResolvedValue([
      {
        status: 'ok',
        id: 't-10',
      },
      {
        status: 'ok',
        id: 't-11',
      },
      {
        status: 'error',
        message: 'not registered',
        errorCode: 'DeviceNotRegistered',
      },
    ]);

    await sender.notifyOccurrence(occurrence, 0);

    expect(devices.findActiveForUsers).toHaveBeenCalledWith([1, 2]);
    const [messages] = push.send.mock.calls[0] as [{ to: string;
      body: string;
      categoryId: string;
      data: { url: string } }[]];
    expect(messages.map((message) => [message.to, message.body])).toEqual([
      ['ExponentPushToken[device-10]', 'À faire maintenant · Living room'],
      ['ExponentPushToken[device-11]', 'Due now · Living room'],
      ['ExponentPushToken[device-12]', 'Due now · Living room'],
    ]);
    expect(messages[0]).toMatchObject({
      categoryId: 'routine-occurrence',
      data: { url: 'pethouse://tanks/42/routines/7' },
    });
    const recorded = em.persist.mock.calls.map(([delivery]: [NotificationDelivery]) => [
      delivery.deviceToken.id,
      delivery.expoTicketId,
      delivery.error,
    ]);
    expect(recorded).toEqual([
      [10, 't-10', null],
      [11, 't-11', null],
      [12, null, 'DeviceNotRegistered'],
    ]);
    expect(devices.revokeTokenIds).toHaveBeenCalledWith([12], expect.any(Date));
  });

  it('skips devices a previous run of the same notification already reached', async () => {
    deliveries.deliveredDeviceIds.mockResolvedValue(new Set([10]));
    devices.findActiveForUsers.mockResolvedValue([device(10, alex), device(11, sam)]);
    push.send.mockResolvedValue([{
      status: 'ok',
      id: 't-11',
    }]);

    await sender.notifyOccurrence(occurrence, 1);

    expect(deliveries.deliveredDeviceIds).toHaveBeenCalledWith(311, 1);
    const [messages] = push.send.mock.calls[0] as [{ to: string }[]];
    expect(messages.map((message) => message.to)).toEqual(['ExponentPushToken[device-11]']);
  });

  it('calls Expo for nobody when no member has a device', async () => {
    devices.findActiveForUsers.mockResolvedValue([]);

    await sender.notifyOccurrence(occurrence, 0);

    expect(push.send).not.toHaveBeenCalled();
  });

  it('records nothing when the send itself fails, so the retried job sends to everyone', async () => {
    devices.findActiveForUsers.mockResolvedValue([device(10, alex)]);
    push.send.mockRejectedValue(new Error('Expo Push answered 503 on /send'));

    await expect(sender.notifyOccurrence(occurrence, 0)).rejects.toThrow('503');

    expect(em.persist).not.toHaveBeenCalled();
  });
});

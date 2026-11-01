import { NotFoundException } from '@nestjs/common';
import { User } from '@modules/users/entity/user.entity';
import { DevicePlatform } from '../entity/device-platform.enum';
import { DeviceToken } from '../entity/device-token.entity';
import { DeviceTokenRepository } from '../repository/device-token.repository';
import { DeviceTokensService } from './device-tokens.service';

describe('DeviceTokensService', () => {
  const em = {
    persistAndFlush: jest.fn(),
    flush: jest.fn(),
  };
  const devices = {
    findOne: jest.fn(),
    create: jest.fn((data: Partial<DeviceToken>) => Object.assign(new DeviceToken(), data)),
    findActiveForUser: jest.fn(),
    getEntityManager: () => em,
  };
  const alex = Object.assign(new User(), { id: 1 });
  const sam = Object.assign(new User(), { id: 2 });
  const now = new Date('2026-11-02T12:00:00Z');
  const token = 'ExponentPushToken[abc]';
  let service: DeviceTokensService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeviceTokensService(devices as unknown as DeviceTokenRepository);
  });

  it('registers a new token', async () => {
    devices.findOne.mockResolvedValue(null);

    const device = await service.register(alex, {
      expoPushToken: token,
      platform: DevicePlatform.IOS,
    }, now);

    expect(device).toMatchObject({
      user: alex,
      expoPushToken: token,
      platform: DevicePlatform.IOS,
      lastSeenAt: now,
      revokedAt: null,
    });
    expect(em.persistAndFlush).toHaveBeenCalledWith(device);
  });

  it('moves a known token to the caller and reactivates it', async () => {
    const existing = Object.assign(new DeviceToken(), {
      id: 5,
      user: alex,
      expoPushToken: token,
      platform: DevicePlatform.ANDROID,
      lastSeenAt: new Date('2026-10-01T00:00:00Z'),
      revokedAt: new Date('2026-10-02T00:00:00Z'),
    });
    devices.findOne.mockResolvedValue(existing);

    const device = await service.register(sam, {
      expoPushToken: token,
      platform: DevicePlatform.ANDROID,
    }, now);

    expect(device).toBe(existing);
    expect(device).toMatchObject({
      user: sam,
      lastSeenAt: now,
      revokedAt: null,
    });
  });

  it('revokes only one of the caller\'s active devices', async () => {
    devices.findOne.mockResolvedValue(null);

    await expect(service.revoke(alex, 5, now)).rejects.toThrow(NotFoundException);
    expect(devices.findOne).toHaveBeenCalledWith({
      id: 5,
      user: 1,
      revokedAt: null,
    });
  });
});

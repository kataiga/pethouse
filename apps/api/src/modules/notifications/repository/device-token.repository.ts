import { EntityRepository } from '@mikro-orm/mysql';
import type { DeviceToken } from '../entity/device-token.entity';

export class DeviceTokenRepository extends EntityRepository<DeviceToken> {
  /** Devices still allowed to receive pushes, for every listed user. */
  findActiveForUsers (userIds: number[]): Promise<DeviceToken[]> {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.find({
      user: { $in: userIds },
      revokedAt: null,
    }, {
      populate: ['user'],
      orderBy: { id: 'asc' },
    });
  }

  findActiveForUser (userId: number): Promise<DeviceToken[]> {
    return this.find({
      user: userId,
      revokedAt: null,
    }, { orderBy: { lastSeenAt: 'desc' } });
  }

  async revokeTokenIds (ids: number[], now: Date): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.nativeUpdate({
      id: { $in: ids },
      revokedAt: null,
    }, { revokedAt: now });
  }
}

import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { User } from '@modules/users/entity/user.entity';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { DeviceToken } from '../entity/device-token.entity';
import { DeviceTokenRepository } from '../repository/device-token.repository';

@Injectable()
export class DeviceTokensService {
  constructor (private readonly devices: DeviceTokenRepository) {}

  list (user: User): Promise<DeviceToken[]> {
    return this.devices.findActiveForUser(user.id);
  }

  /**
   * Registers or refreshes a token for the caller. A token already known moves to the caller and
   * is reactivated: an installation belongs to whoever signed in on it last.
   */
  async register (user: User, dto: RegisterDeviceDto, now: Date = new Date()): Promise<DeviceToken> {
    const existing = await this.devices.findOne({ expoPushToken: dto.expoPushToken });
    const device = existing ?? this.devices.create({
      user,
      expoPushToken: dto.expoPushToken,
      platform: dto.platform,
      lastSeenAt: now,
    });

    device.user = user;
    device.platform = dto.platform;
    device.lastSeenAt = now;
    device.revokedAt = null;
    await this.devices.getEntityManager().persistAndFlush(device);

    return device;
  }

  /** Stops pushes to one of the caller's devices, typically on sign-out. */
  async revoke (user: User, id: number, now: Date = new Date()): Promise<void> {
    const device = await this.devices.findOne({
      id,
      user: user.id,
      revokedAt: null,
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.revokedAt = now;
    await this.devices.getEntityManager().flush();
  }
}

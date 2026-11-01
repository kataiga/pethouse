import {
  Entity, EntityRepositoryType, Enum, ManyToOne, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { User } from '@modules/users/entity/user.entity';
import { DeviceTokenRepository } from '../repository/device-token.repository';
import { DevicePlatform } from './device-platform.enum';

/**
 * An Expo push token of one installation. A token belongs to whoever registered it last: the
 * same phone signing in with another account moves it. `revokedAt` set means never push to it
 * again, either because the user signed out or because Expo reported it unregistered.
 */
@Entity({
  tableName: 'device_tokens',
  repository: () => DeviceTokenRepository,
})
export class DeviceToken {
  [EntityRepositoryType]?: DeviceTokenRepository;

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property({
    length: 255,
    unique: true,
  })
  expoPushToken!: string;

  @Enum(() => DevicePlatform)
  platform!: DevicePlatform;

  @Property()
  lastSeenAt!: Date;

  @Property({ nullable: true })
  revokedAt?: Date | null = null;

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();
}

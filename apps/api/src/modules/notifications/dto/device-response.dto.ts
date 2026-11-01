import { ApiProperty } from '@nestjs/swagger';
import { DevicePlatform } from '../entity/device-platform.enum';
import { DeviceToken } from '../entity/device-token.entity';

export class DeviceResponseDto {
  @ApiProperty({ example: 12 })
  readonly id: number;

  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  readonly expoPushToken: string;

  @ApiProperty({
    enum: DevicePlatform,
    enumName: 'DevicePlatform',
  })
  readonly platform: DevicePlatform;

  @ApiProperty({ example: '2026-11-01T18:00:00.000Z' })
  readonly lastSeenAt: string;

  constructor (device: DeviceToken) {
    this.id = device.id;
    this.expoPushToken = device.expoPushToken;
    this.platform = device.platform;
    this.lastSeenAt = device.lastSeenAt.toISOString();
  }

  static fromEntity (device: DeviceToken): DeviceResponseDto {
    return new DeviceResponseDto(device);
  }
}

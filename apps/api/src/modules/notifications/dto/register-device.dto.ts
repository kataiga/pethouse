import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum, Matches, MaxLength,
} from 'class-validator';
import { DevicePlatform } from '../entity/device-platform.enum';

export const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]\s]+\]$/;

export class RegisterDeviceDto {
  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Token from `getExpoPushTokenAsync()`.',
    maxLength: 255,
  })
  @MaxLength(255)
  @Matches(EXPO_PUSH_TOKEN_PATTERN, { message: 'expoPushToken must be an Expo push token' })
  expoPushToken!: string;

  @ApiProperty({
    enum: DevicePlatform,
    enumName: 'DevicePlatform',
  })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString, MaxLength, MinLength,
} from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token issued by register, login or a previous refresh.' })
  @IsString()
  @MinLength(16)
  @MaxLength(2048)
  refreshToken!: string;
}

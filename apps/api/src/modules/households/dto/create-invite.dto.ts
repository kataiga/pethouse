import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt, IsOptional, Max, Min,
} from 'class-validator';

export const DEFAULT_INVITE_HOURS = 168;

export const MAX_INVITE_HOURS = 720;

export const DEFAULT_INVITE_USES = 10;

export const MAX_INVITE_USES = 100;

export class CreateInviteDto {
  @ApiPropertyOptional({
    example: DEFAULT_INVITE_HOURS,
    minimum: 1,
    maximum: MAX_INVITE_HOURS,
    description: 'Validity in hours. Defaults to one week.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INVITE_HOURS)
  expiresInHours?: number;

  @ApiPropertyOptional({
    example: DEFAULT_INVITE_USES,
    minimum: 1,
    maximum: MAX_INVITE_USES,
    description: 'How many accounts may redeem the code.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_INVITE_USES)
  maxUses?: number;
}

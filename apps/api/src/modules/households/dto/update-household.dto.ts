import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional, IsString, Length,
} from 'class-validator';
import { IsIanaTimeZone } from '@common/validators/is-iana-time-zone';

export class UpdateHouseholdDto {
  @ApiPropertyOptional({
    example: 'Home',
    minLength: 1,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({ example: 'Europe/Paris' })
  @IsOptional()
  @IsIanaTimeZone()
  timezone?: string;
}

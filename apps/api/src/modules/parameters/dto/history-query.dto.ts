import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString, IsIn, IsInt, IsOptional, IsPositive,
} from 'class-validator';

export const HISTORY_BUCKETS = ['hour', 'day', 'week'] as const;

export const MAX_HISTORY_DAYS = 366;

export class HistoryQueryDto {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  parameterDefinitionId!: number;

  @ApiPropertyOptional({
    example: '2026-01-01T00:00:00.000Z',
    description: 'Defaults to 30 days before `to`.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-01-31T23:59:59.000Z',
    description: 'Defaults to now.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    enum: HISTORY_BUCKETS,
    default: 'day',
  })
  @IsOptional()
  @IsIn(HISTORY_BUCKETS)
  bucket: typeof HISTORY_BUCKETS[number] = 'day';
}

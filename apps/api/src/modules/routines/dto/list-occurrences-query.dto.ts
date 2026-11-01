import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsOptional,
} from 'class-validator';

export class ListOccurrencesQueryDto {
  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Defaults to 30 days ago. The range spans at most 92 days.',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-12-01T00:00:00.000Z',
    description: 'Defaults to the end of the materialised window, 30 days ahead.',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

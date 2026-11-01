import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString, IsInt, IsOptional, IsPositive,
} from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class ListMeasurementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'Restrict to one parameter.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  parameterDefinitionId?: number;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

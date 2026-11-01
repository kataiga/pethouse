import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt, IsOptional, IsPositive,
} from 'class-validator';
import { PaginationQueryDto } from '@common/dto/pagination-query.dto';

export class RoutineHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 7,
    description: 'Restrict to one routine of the tank.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  routineId?: number;
}

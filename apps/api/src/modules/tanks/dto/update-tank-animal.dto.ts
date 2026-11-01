import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsInt, IsOptional, IsPositive, IsString, Length, Max, MaxLength, ValidateIf,
} from 'class-validator';
import { MAX_QUANTITY } from './add-tank-animal.dto';

function Nullable (): PropertyDecorator {
  return ValidateIf((_object, value) => value !== null && value !== undefined);
}

export class UpdateTankAnimalDto {
  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: MAX_QUANTITY,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(MAX_QUANTITY)
  quantity?: number;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Calendar date, YYYY-MM-DD.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Length(10, 10)
  addedAt?: string;

  @ApiPropertyOptional({
    example: '2026-06-30',
    nullable: true,
    type: String,
    description: 'Set to mark the species as gone from the tank; null brings it back.',
  })
  @Nullable()
  @IsDateString({ strict: true })
  @Length(10, 10)
  removedAt?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    maxLength: 500,
  })
  @Nullable()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

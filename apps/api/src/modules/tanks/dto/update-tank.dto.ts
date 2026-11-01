import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, Length, Max, MaxLength, Min, ValidateIf,
} from 'class-validator';
import {
  MAX_DIMENSION_CM, MAX_VOLUME_LITERS,
} from './create-tank.dto';

/** Only when the value is present and not null: null is the explicit "clear this field". */
function Nullable (): PropertyDecorator {
  return ValidateIf((_object, value) => value !== null && value !== undefined);
}

/**
 * Every field optional; the nullable ones accept `null` to clear the value. `tankType` is fixed
 * at creation: changing it would orphan the subtype and, later, the parameters.
 */
export class UpdateTankDto {
  @ApiPropertyOptional({
    example: 'Living room 120L',
    minLength: 1,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({
    example: 3,
    nullable: true,
    type: Number,
    description: 'Null detaches the subtype.',
  })
  @Nullable()
  @IsInt()
  @IsPositive()
  subtypeId?: number | null;

  @ApiPropertyOptional({
    example: 120,
    nullable: true,
    type: Number,
  })
  @Nullable()
  @IsNumber()
  @Min(0)
  @Max(MAX_VOLUME_LITERS)
  volumeLiters?: number | null;

  @ApiPropertyOptional({
    example: 100,
    nullable: true,
    type: Number,
  })
  @Nullable()
  @IsNumber()
  @Min(0)
  @Max(MAX_DIMENSION_CM)
  widthCm?: number | null;

  @ApiPropertyOptional({
    example: 40,
    nullable: true,
    type: Number,
  })
  @Nullable()
  @IsNumber()
  @Min(0)
  @Max(MAX_DIMENSION_CM)
  heightCm?: number | null;

  @ApiPropertyOptional({
    example: 30,
    nullable: true,
    type: Number,
  })
  @Nullable()
  @IsNumber()
  @Min(0)
  @Max(MAX_DIMENSION_CM)
  depthCm?: number | null;

  @ApiPropertyOptional({
    example: 'Aquasoil',
    nullable: true,
    type: String,
    maxLength: 120,
  })
  @Nullable()
  @IsString()
  @MaxLength(120)
  substrate?: string | null;

  @ApiPropertyOptional({
    example: '2026-01-15',
    nullable: true,
    type: String,
    description: 'Calendar date, YYYY-MM-DD.',
  })
  @Nullable()
  @IsDateString({ strict: true })
  @Length(10, 10)
  startedAt?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    maxLength: 2000,
  })
  @Nullable()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    example: 7,
    nullable: true,
    type: Number,
    description: 'One of the tank\'s own photos. Null clears the cover.',
  })
  @Nullable()
  @IsInt()
  @IsPositive()
  coverPhotoId?: number | null;
}

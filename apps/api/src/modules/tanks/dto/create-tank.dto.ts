import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, IsString, Length, Max, MaxLength, Min,
} from 'class-validator';
import { TankType } from '@common/enums/tank-type.enum';

export const MAX_VOLUME_LITERS = 100_000;

export const MAX_DIMENSION_CM = 2_000;

export class CreateTankDto {
  @ApiProperty({
    example: 'Living room 120L',
    minLength: 1,
    maxLength: 80,
  })
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({ enum: TankType })
  @IsEnum(TankType)
  tankType!: TankType;

  @ApiPropertyOptional({
    example: 3,
    description: 'A system subtype or one of this household, matching tankType.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  subtypeId?: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_VOLUME_LITERS)
  volumeLiters?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_DIMENSION_CM)
  widthCm?: number;

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_DIMENSION_CM)
  heightCm?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_DIMENSION_CM)
  depthCm?: number;

  @ApiPropertyOptional({
    example: 'Aquasoil',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  substrate?: string;

  @ApiPropertyOptional({
    example: '2026-01-15',
    description: 'Calendar date, YYYY-MM-DD.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Length(10, 10)
  startedAt?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

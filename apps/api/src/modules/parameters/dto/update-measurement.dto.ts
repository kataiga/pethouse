import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString, IsNumber, IsOptional, IsString, MaxLength, ValidateIf,
} from 'class-validator';

function Nullable (): PropertyDecorator {
  return ValidateIf((_object, value) => value !== null && value !== undefined);
}

export class UpdateMeasurementDto {
  @ApiPropertyOptional({ example: 7.2 })
  @IsOptional()
  @IsNumber({ allowInfinity: false,
    allowNaN: false })
  value?: number;

  @ApiPropertyOptional({ example: '2026-03-01T18:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    maxLength: 500,
  })
  @Nullable()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

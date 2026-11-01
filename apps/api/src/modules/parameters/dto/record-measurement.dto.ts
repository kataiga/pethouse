import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength,
} from 'class-validator';

export class RecordMeasurementDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @IsPositive()
  parameterDefinitionId!: number;

  @ApiProperty({ example: 7.2 })
  @IsNumber({ allowInfinity: false,
    allowNaN: false })
  value!: number;

  @ApiPropertyOptional({
    example: '2026-03-01T18:30:00.000Z',
    description: 'When the reading was taken. Defaults to now.',
  })
  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsDateString, IsInt, IsOptional, IsPositive, IsString, Length, Max, MaxLength,
} from 'class-validator';

export const MAX_QUANTITY = 10_000;

export class AddTankPlantDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  @IsPositive()
  plantSpeciesId!: number;

  @ApiProperty({
    example: 6,
    minimum: 1,
    maximum: MAX_QUANTITY,
  })
  @IsInt()
  @IsPositive()
  @Max(MAX_QUANTITY)
  quantity!: number;

  @ApiPropertyOptional({
    example: '2026-03-01',
    description: 'Calendar date, YYYY-MM-DD. Defaults to today.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Length(10, 10)
  addedAt?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

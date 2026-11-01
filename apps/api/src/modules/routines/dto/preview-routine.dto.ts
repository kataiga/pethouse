import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsInt, IsOptional, IsString, Max, MaxLength, Min,
} from 'class-validator';
import {
  DTSTART_DESCRIPTION, DTSTART_EXAMPLE, RRULE_DESCRIPTION, RRULE_EXAMPLE,
} from './routine-schedule-fields';

export const MAX_PREVIEW_COUNT = 50;

export class PreviewRoutineDto {
  @ApiProperty({
    example: RRULE_EXAMPLE,
    description: RRULE_DESCRIPTION,
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  rrule!: string;

  @ApiProperty({
    example: DTSTART_EXAMPLE,
    description: DTSTART_DESCRIPTION,
  })
  @IsString()
  dtstart!: string;

  @ApiPropertyOptional({
    default: 5,
    minimum: 1,
    maximum: MAX_PREVIEW_COUNT,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PREVIEW_COUNT)
  count: number = 5;
}

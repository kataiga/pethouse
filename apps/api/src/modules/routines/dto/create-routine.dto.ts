import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsBoolean, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min,
} from 'class-validator';
import {
  DTSTART_DESCRIPTION,
  DTSTART_EXAMPLE,
  MAX_REMINDER_MINUTES,
  MAX_REMINDER_REPEATS,
  MIN_REMINDER_MINUTES,
  Nullable,
  RRULE_DESCRIPTION,
  RRULE_EXAMPLE,
} from './routine-schedule-fields';

export class CreateRoutineDto {
  @ApiProperty({
    example: 'Water change',
    minLength: 1,
    maxLength: 120,
  })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiPropertyOptional({
    maxLength: 500,
    nullable: true,
    type: String,
  })
  @Nullable()
  @IsString()
  @MaxLength(500)
  description?: string | null;

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

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 60,
    nullable: true,
    type: Number,
    minimum: MIN_REMINDER_MINUTES,
    maximum: MAX_REMINDER_MINUTES,
    description: 'Minutes between reminders while nobody acts. Null or absent: no escalation.',
  })
  @Nullable()
  @IsInt()
  @Min(MIN_REMINDER_MINUTES)
  @Max(MAX_REMINDER_MINUTES)
  reminderRepeatMinutes?: number | null;

  @ApiPropertyOptional({
    example: 3,
    default: 0,
    minimum: 0,
    maximum: MAX_REMINDER_REPEATS,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_REMINDER_REPEATS)
  reminderMaxRepeats?: number;
}

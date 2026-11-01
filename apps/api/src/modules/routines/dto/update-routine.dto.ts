import { ApiPropertyOptional } from '@nestjs/swagger';
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

/**
 * Every field optional; `description` and `reminderRepeatMinutes` accept null to clear them.
 * Changing the rule, the start or the active flag re-plans the pending occurrences ahead; done,
 * skipped and past ones are kept.
 */
export class UpdateRoutineDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiPropertyOptional({
    maxLength: 500,
    nullable: true,
    type: String,
  })
  @Nullable()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    example: RRULE_EXAMPLE,
    description: RRULE_DESCRIPTION,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  rrule?: string;

  @ApiPropertyOptional({
    example: DTSTART_EXAMPLE,
    description: DTSTART_DESCRIPTION,
  })
  @IsOptional()
  @IsString()
  dtstart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    minimum: MIN_REMINDER_MINUTES,
    maximum: MAX_REMINDER_MINUTES,
  })
  @Nullable()
  @IsInt()
  @Min(MIN_REMINDER_MINUTES)
  @Max(MAX_REMINDER_MINUTES)
  reminderRepeatMinutes?: number | null;

  @ApiPropertyOptional({
    minimum: 0,
    maximum: MAX_REMINDER_REPEATS,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_REMINDER_REPEATS)
  reminderMaxRepeats?: number;
}

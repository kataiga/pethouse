import { ApiProperty } from '@nestjs/swagger';
import { UserSummaryDto } from '@modules/users/dto/user-summary.dto';
import type { RoutineView } from '../service/routines.service';
import {
  DTSTART_DESCRIPTION, DTSTART_EXAMPLE, RRULE_EXAMPLE,
} from './routine-schedule-fields';

export class RoutineResponseDto {
  @ApiProperty({ example: 7 })
  readonly id: number;

  @ApiProperty({ example: 'Water change' })
  readonly name: string;

  @ApiProperty({
    nullable: true,
    type: String,
  })
  readonly description: string | null;

  @ApiProperty({ example: RRULE_EXAMPLE })
  readonly rrule: string;

  @ApiProperty({
    example: DTSTART_EXAMPLE,
    description: DTSTART_DESCRIPTION,
  })
  readonly dtstart: string;

  @ApiProperty({
    example: 'Europe/Paris',
    description: 'Household time zone the schedule resolves against.',
  })
  readonly timezone: string;

  @ApiProperty()
  readonly isActive: boolean;

  @ApiProperty({
    nullable: true,
    type: Number,
    example: 60,
  })
  readonly reminderRepeatMinutes: number | null;

  @ApiProperty({ example: 3 })
  readonly reminderMaxRepeats: number;

  @ApiProperty({
    nullable: true,
    type: String,
    example: '2026-11-02T18:00:00.000Z',
    description: 'Next occurrence after now, from the RRULE; null when inactive or finished.',
  })
  readonly nextOccurrenceAt: string | null;

  @ApiProperty({ type: () => UserSummaryDto })
  readonly createdBy: UserSummaryDto;

  @ApiProperty({ example: '2026-11-01T18:00:00.000Z' })
  readonly createdAt: string;

  constructor (view: RoutineView) {
    const { routine } = view;
    this.id = routine.id;
    this.name = routine.name;
    this.description = routine.description ?? null;
    this.rrule = routine.rrule;
    this.dtstart = routine.dtstart;
    this.timezone = view.timezone;
    this.isActive = routine.isActive;
    this.reminderRepeatMinutes = routine.reminderRepeatMinutes ?? null;
    this.reminderMaxRepeats = routine.reminderMaxRepeats;
    this.nextOccurrenceAt = view.nextOccurrenceAt?.toISOString() ?? null;
    this.createdBy = new UserSummaryDto(routine.createdBy);
    this.createdAt = routine.createdAt.toISOString();
  }

  static fromView (view: RoutineView): RoutineResponseDto {
    return new RoutineResponseDto(view);
  }
}

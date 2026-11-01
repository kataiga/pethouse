import {
  ApiProperty, ApiPropertyOptional,
} from '@nestjs/swagger';
import { UserSummaryDto } from '@modules/users/dto/user-summary.dto';
import { OccurrenceStatus } from '../entity/occurrence-status.enum';
import { RoutineOccurrence } from '../entity/routine-occurrence.entity';
import { RoutineSummaryDto } from './routine-summary.dto';

export class OccurrenceResponseDto {
  @ApiProperty({ example: 311 })
  readonly id: number;

  @ApiProperty({ type: () => RoutineSummaryDto })
  readonly routine: RoutineSummaryDto;

  @ApiProperty({
    example: '2026-11-02T18:00:00.000Z',
    description: 'UTC instant the occurrence is due.',
  })
  readonly scheduledFor: string;

  @ApiProperty({
    enum: OccurrenceStatus,
    enumName: 'OccurrenceStatus',
  })
  readonly status: OccurrenceStatus;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'When it was done or skipped.',
  })
  readonly completedAt: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: () => UserSummaryDto,
    description: 'Who did or skipped it.',
  })
  readonly completedBy: UserSummaryDto | null;

  constructor (occurrence: RoutineOccurrence) {
    this.id = occurrence.id;
    this.routine = new RoutineSummaryDto(occurrence.routine);
    this.scheduledFor = occurrence.scheduledFor.toISOString();
    this.status = occurrence.status;
    this.completedAt = occurrence.completedAt?.toISOString() ?? null;
    this.completedBy = occurrence.completedBy ? new UserSummaryDto(occurrence.completedBy) : null;
  }

  static fromEntity (occurrence: RoutineOccurrence): OccurrenceResponseDto {
    return new OccurrenceResponseDto(occurrence);
  }
}

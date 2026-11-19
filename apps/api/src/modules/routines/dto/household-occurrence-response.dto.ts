import { ApiProperty } from '@nestjs/swagger';
import type { RoutineOccurrence } from '../entity/routine-occurrence.entity';
import { OccurrenceResponseDto } from './occurrence-response.dto';
import { TankSummaryDto } from './tank-summary.dto';

/** An occurrence seen across the household: it also names the tank it is for. */
export class HouseholdOccurrenceResponseDto extends OccurrenceResponseDto {
  @ApiProperty({ type: () => TankSummaryDto })
  readonly tank: TankSummaryDto;

  constructor (occurrence: RoutineOccurrence) {
    super(occurrence);
    this.tank = new TankSummaryDto(occurrence.routine.tank);
  }

  static fromEntity (occurrence: RoutineOccurrence): HouseholdOccurrenceResponseDto {
    return new HouseholdOccurrenceResponseDto(occurrence);
  }
}

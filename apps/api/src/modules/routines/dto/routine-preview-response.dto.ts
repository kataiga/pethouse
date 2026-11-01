import { ApiProperty } from '@nestjs/swagger';

export class RoutinePreviewResponseDto {
  @ApiProperty({
    example: 'Europe/Paris',
    description: 'Household time zone the rule was expanded in.',
  })
  readonly timezone: string;

  @ApiProperty({
    type: [String],
    example: ['2026-11-02T18:00:00.000Z', '2026-11-04T18:00:00.000Z'],
    description: 'Next occurrences after now, as UTC instants.',
  })
  readonly occurrences: string[];

  constructor (timezone: string, occurrences: Date[]) {
    this.timezone = timezone;
    this.occurrences = occurrences.map((date) => date.toISOString());
  }
}

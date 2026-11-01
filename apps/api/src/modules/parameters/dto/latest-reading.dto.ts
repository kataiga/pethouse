import { ApiProperty } from '@nestjs/swagger';
import { LatestReading } from '../repository/measurement.repository';

export class LatestReadingDto {
  @ApiProperty({ example: 7.2 })
  readonly value: number;

  @ApiProperty({ example: '2026-03-01T18:30:00.000Z' })
  readonly measuredAt: string;

  constructor (reading: LatestReading) {
    this.value = reading.value;
    this.measuredAt = reading.measuredAt.toISOString();
  }
}

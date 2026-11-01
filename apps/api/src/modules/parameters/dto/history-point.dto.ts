import { ApiProperty } from '@nestjs/swagger';
import { HistoryPoint } from '../repository/measurement.repository';

export class HistoryPointDto {
  @ApiProperty({
    example: '2026-03-01T00:00:00.000Z',
    description: 'Start of the bucket, UTC.',
  })
  readonly bucketStart: string;

  @ApiProperty({ example: 3 })
  readonly count: number;

  @ApiProperty({ example: 7 })
  readonly min: number;

  @ApiProperty({ example: 7.4 })
  readonly max: number;

  @ApiProperty({ example: 7.2 })
  readonly avg: number;

  @ApiProperty({
    example: 7.3,
    description: 'The latest reading of the bucket.',
  })
  readonly last: number;

  constructor (point: HistoryPoint) {
    this.bucketStart = point.bucketStart.toISOString();
    this.count = point.count;
    this.min = point.min;
    this.max = point.max;
    this.avg = point.avg;
    this.last = point.last;
  }
}

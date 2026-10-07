import { ApiProperty } from '@nestjs/swagger';

export type HealthIndicatorStatus = 'up' | 'down';

export class HealthIndicatorDto {
  @ApiProperty({
    enum: ['up', 'down'],
    example: 'up',
  })
  readonly status: HealthIndicatorStatus;

  constructor (status: HealthIndicatorStatus) {
    this.status = status;
  }
}

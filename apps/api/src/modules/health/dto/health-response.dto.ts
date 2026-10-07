import {
  ApiProperty, getSchemaPath,
} from '@nestjs/swagger';
import type { HealthCheckResult } from '@nestjs/terminus';
import {
  HealthIndicatorDto, HealthIndicatorStatus,
} from './health-indicator.dto';

export type HealthStatus = 'ok' | 'error' | 'shutting_down';

/** Public shape of the health check, decoupled from the terminus result type. */
export class HealthResponseDto {
  @ApiProperty({
    enum: ['ok', 'error', 'shutting_down'],
    example: 'ok',
  })
  readonly status: HealthStatus;

  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(HealthIndicatorDto) },
    example: { database: { status: 'up' } },
    description: 'One entry per checked dependency.',
  })
  readonly details: Record<string, HealthIndicatorDto>;

  constructor (status: HealthStatus, details: Record<string, HealthIndicatorDto>) {
    this.status = status;
    this.details = details;
  }

  static fromResult (result: HealthCheckResult): HealthResponseDto {
    const details = Object.fromEntries(
      Object.entries(result.details).map(([key, indicator]) => [
        key,
        new HealthIndicatorDto(indicator.status as HealthIndicatorStatus),
      ]),
    );

    return new HealthResponseDto(result.status, details);
  }
}

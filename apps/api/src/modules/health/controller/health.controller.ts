import {
  Controller, Get, HttpStatus, Res, ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiExtraModels, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheckResult, HealthCheckService, MikroOrmHealthIndicator,
} from '@nestjs/terminus';
import type { Response } from 'express';
import { HealthIndicatorDto } from '../dto/health-indicator.dto';
import { HealthResponseDto } from '../dto/health-response.dto';

const DATABASE_PING_TIMEOUT_MS = 1500;

function isHealthCheckResult (value: unknown): value is HealthCheckResult {
  return typeof value === 'object' && value !== null && 'status' in value && 'details' in value;
}

@ApiTags('health')
@ApiExtraModels(HealthIndicatorDto)
@Controller('health')
export class HealthController {
  constructor (
    private readonly health: HealthCheckService,
    private readonly database: MikroOrmHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liveness and readiness of the API and its database.' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({
    type: HealthResponseDto,
    description: 'At least one dependency is down; the body says which.',
  })
  async check (@Res({ passthrough: true }) response: Response): Promise<HealthResponseDto> {
    const result = await this.run();

    if (result.status !== 'ok') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return HealthResponseDto.fromResult(result);
  }

  /** Terminus reports a failed check by throwing; the failing result is the exception body. */
  private async run (): Promise<HealthCheckResult> {
    try {
      return await this.health.check([
        () => this.database.pingCheck('database', { timeout: DATABASE_PING_TIMEOUT_MS }),
      ]);
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) {
        const body = error.getResponse();

        if (isHealthCheckResult(body)) {
          return body;
        }
      }

      throw error;
    }
  }
}

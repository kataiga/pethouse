// class-transformer and class-validator read decorator metadata; the Nest runtime loads this
// polyfill itself, standalone callers (the unit test) do not.
import 'reflect-metadata';
import {
  plainToInstance, Transform,
} from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { NodeEnvironment } from './types';

const NODE_ENVIRONMENTS: NodeEnvironment[] = ['development', 'test', 'production'];
const MIN_SECRET_LENGTH = 32;
const MAX_PORT = 65535;
/** `15m`, `12h`, `30d`: the duration shorthand understood by the JWT library. */
const DURATION = /^\d+(ms|s|m|h|d)$/;

function toBoolean ({ value }: { value: unknown }): unknown {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
}

/**
 * Every environment variable the API reads, with its constraints. Validated once at boot by
 * `ConfigModule`; a missing or malformed variable stops the process with the full list of problems
 * instead of surfacing as `undefined` somewhere at runtime.
 *
 * Properties are hydrated by class-transformer, hence the definite-assignment markers.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsIn(NODE_ENVIRONMENTS)
  NODE_ENV?: NodeEnvironment;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PORT)
  PORT?: number;

  @IsOptional()
  @IsString()
  LOG_LEVEL?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsString()
  @IsNotEmpty()
  DB_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_PORT)
  DB_PORT!: number;

  @IsString()
  @IsNotEmpty()
  DB_USER!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME!: string;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_PORT)
  REDIS_PORT!: number;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  JWT_ACCESS_SECRET!: string;

  @IsOptional()
  @Matches(DURATION)
  JWT_ACCESS_TTL?: string;

  @IsString()
  @MinLength(MIN_SECRET_LENGTH)
  JWT_REFRESH_SECRET!: string;

  @IsOptional()
  @Matches(DURATION)
  JWT_REFRESH_TTL?: string;

  @IsUrl({
    require_tld: false,
    require_protocol: true,
  })
  S3_ENDPOINT!: string;

  @IsOptional()
  @IsString()
  S3_REGION?: string;

  @IsString()
  @IsNotEmpty()
  S3_ACCESS_KEY!: string;

  @IsString()
  @IsNotEmpty()
  S3_SECRET_KEY!: string;

  @IsString()
  @IsNotEmpty()
  S3_BUCKET!: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  S3_FORCE_PATH_STYLE?: boolean;

  @IsOptional()
  @IsString()
  EXPO_ACCESS_TOKEN?: string;
}

/** Hook for `ConfigModule.forRoot({ validate })`. Throws with every violation listed. */
export function validateEnvironment (config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, {
    whitelist: true,
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    const lines = errors.map((error) => {
      const reasons = Object.values(error.constraints ?? {}).join('; ');

      return `  - ${error.property}: ${reasons}`;
    });

    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`);
  }

  return validated;
}

import { registerAs } from '@nestjs/config';
import { durationToSeconds } from './duration';
import {
  envWithDefault, requireEnv,
} from './env';
import { JwtConfig } from './types';

export default registerAs('jwt', (): JwtConfig => ({
  accessSecret: requireEnv('JWT_ACCESS_SECRET'),
  accessTtlSeconds: durationToSeconds(envWithDefault('JWT_ACCESS_TTL', '15m')),
  refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  refreshTtlSeconds: durationToSeconds(envWithDefault('JWT_REFRESH_TTL', '30d')),
}));

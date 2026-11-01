import { registerAs } from '@nestjs/config';
import {
  envWithDefault, requireEnv,
} from './env';
import { JwtConfig } from './types';

export default registerAs('jwt', (): JwtConfig => ({
  accessSecret: requireEnv('JWT_ACCESS_SECRET'),
  accessTtl: envWithDefault('JWT_ACCESS_TTL', '15m'),
  refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  refreshTtl: envWithDefault('JWT_REFRESH_TTL', '30d'),
}));

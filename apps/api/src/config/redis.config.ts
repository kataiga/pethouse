import { registerAs } from '@nestjs/config';
import {
  envInt, envWithDefault, optionalEnv, requireEnv,
} from './env';
import { RedisConfig } from './types';

export default registerAs('redis', (): RedisConfig => ({
  host: requireEnv('REDIS_HOST'),
  port: envInt('REDIS_PORT'),
  password: optionalEnv('REDIS_PASSWORD'),
  prefix: envWithDefault('REDIS_PREFIX', 'pethouse'),
}));

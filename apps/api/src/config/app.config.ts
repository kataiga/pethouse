import { registerAs } from '@nestjs/config';
import {
  envInt, envList, envWithDefault,
} from './env';
import {
  AppConfig, NodeEnvironment,
} from './types';

const DEFAULT_PORT = 3000;

export default registerAs('app', (): AppConfig => ({
  port: envInt('PORT', DEFAULT_PORT),
  // Validated against the allowed values before this factory runs.
  env: envWithDefault('NODE_ENV', 'development') as NodeEnvironment,
  corsOrigins: envList('CORS_ORIGINS'),
}));

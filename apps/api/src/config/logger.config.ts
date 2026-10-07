import { registerAs } from '@nestjs/config';
import { envWithDefault } from './env';
import { LoggerConfig } from './types';

export default registerAs('logger', (): LoggerConfig => ({
  level: envWithDefault('LOG_LEVEL', 'info'),
  pretty: envWithDefault('NODE_ENV', 'development') !== 'production',
}));

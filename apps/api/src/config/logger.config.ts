import { registerAs } from '@nestjs/config';
import { LoggerConfig } from './types';

export default registerAs('logger', (): LoggerConfig => ({
  level: process.env.LOG_LEVEL ?? 'info',
  pretty: process.env.NODE_ENV !== 'production',
}));

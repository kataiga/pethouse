import { registerAs } from '@nestjs/config';
import { AppConfig } from './types';

const DEFAULT_PORT = 3000;

function parseList (value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default registerAs('app', (): AppConfig => ({
  port: parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10),
  env: (process.env.NODE_ENV as AppConfig['env']),
  corsOrigins: parseList(process.env.CORS_ORIGINS),
}));

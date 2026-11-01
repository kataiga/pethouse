import { registerAs } from '@nestjs/config';
import { AppConfig } from './types';

const DEFAULT_PORT = 3000;

export default registerAs('app', (): AppConfig => ({
  port: parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10),
  env: (process.env.NODE_ENV as AppConfig['env']),
}));

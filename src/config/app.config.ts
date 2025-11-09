import { registerAs } from '@nestjs/config';
import { AppConfig } from './types';

export default registerAs('app', (): AppConfig => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  env: (process.env.NODE_ENV as AppConfig['env']) || 'dev',
}));
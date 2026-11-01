import { registerAs } from '@nestjs/config';
import {
  envInt, requireEnv,
} from './env';
import { DatabaseConfig } from './types';

export function readDatabaseConfig (): DatabaseConfig {
  return {
    host: requireEnv('DB_HOST'),
    port: envInt('DB_PORT'),
    user: requireEnv('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    name: requireEnv('DB_NAME'),
  };
}

export default registerAs('database', readDatabaseConfig);

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface AppConfig {
  port: number;
  env: NodeEnvironment;
  /** Origins allowed by CORS. Empty means no cross-origin browser access. */
  corsOrigins: string[];
}

export interface LoggerConfig {
  level: string;
  pretty: boolean;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
}

export interface JwtConfig {
  accessSecret: string;
  /** Lifetime in the `<number><unit>` form accepted by the JWT library, e.g. `15m`. */
  accessTtl: string;
  refreshSecret: string;
  refreshTtl: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface S3Config {
  endpoint: string;
  region: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  /** Required by MinIO, which does not route buckets as sub-domains. */
  forcePathStyle: boolean;
}

export interface PushConfig {
  /** Optional Expo access token; Expo Push accepts unauthenticated requests at a lower rate. */
  expoAccessToken?: string;
}

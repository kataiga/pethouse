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
  /** Lifetimes in seconds, parsed from the `15m` / `30d` form of the environment. */
  accessTtlSeconds: number;
  refreshSecret: string;
  refreshTtlSeconds: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  /** Key prefix of the BullMQ queues, so test runs never share jobs with a dev instance. */
  prefix: string;
}

export interface SchedulerConfig {
  /** Run the BullMQ workers and register the recurring jobs in this process. */
  enabled: boolean;
}

export interface S3Config {
  /** Endpoint the API talks to; inside the cluster this is the internal MinIO service. */
  endpoint: string;
  /** Base URL clients read objects from: the public ingress. Defaults to `endpoint`. */
  publicUrl: string;
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
  /** Base URL of the Expo Push API; overridden only to point tests at a fake. */
  expoApiUrl: string;
}

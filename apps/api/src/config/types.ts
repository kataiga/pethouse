export interface AppConfig {
  port: number;
  env: 'dev' | 'prod' | 'test';
  /** Origins allowed by CORS. Empty means no cross-origin browser access. */
  corsOrigins: string[];
}

export interface LoggerConfig {
  level: string;
  pretty: boolean;
}

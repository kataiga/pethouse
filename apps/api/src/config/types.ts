export interface AppConfig {
  port: number;
  env: 'dev' | 'prod' | 'test';
}

export interface LoggerConfig {
  level: string;
  pretty: boolean;
}

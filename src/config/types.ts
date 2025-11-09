export interface AppConfig {
  port: number;
  env: 'dev' | 'prod' | 'test';
}
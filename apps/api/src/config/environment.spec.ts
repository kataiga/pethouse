import { validateEnvironment } from './environment';

const VALID = {
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_USER: 'root',
  DB_PASSWORD: 'pethouse',
  DB_NAME: 'pethouse',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_ACCESS_KEY: 'pethouse',
  S3_SECRET_KEY: 'pethouse-dev-secret',
  S3_BUCKET: 'pethouse-photos',
};

describe('validateEnvironment', () => {
  it('accepts a complete configuration and coerces numbers and booleans', () => {
    const result = validateEnvironment({
      ...VALID,
      PORT: '3000',
      S3_FORCE_PATH_STYLE: 'true',
    });

    expect(result.DB_PORT).toBe(3306);
    expect(result.PORT).toBe(3000);
    expect(result.S3_FORCE_PATH_STYLE).toBe(true);
  });

  it('lists every missing variable in one error', () => {
    const incomplete: Record<string, unknown> = { ...VALID };
    delete incomplete.DB_HOST;
    delete incomplete.JWT_ACCESS_SECRET;

    expect(() => validateEnvironment(incomplete)).toThrow(/DB_HOST/);
    expect(() => validateEnvironment(incomplete)).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnvironment({
      ...VALID,
      JWT_ACCESS_SECRET: 'too-short',
    })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects an out-of-range port and a malformed duration', () => {
    expect(() => validateEnvironment({
      ...VALID,
      DB_PORT: '70000',
    })).toThrow(/DB_PORT/);
    expect(() => validateEnvironment({
      ...VALID,
      JWT_ACCESS_TTL: 'fifteen minutes',
    })).toThrow(/JWT_ACCESS_TTL/);
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnvironment({
      ...VALID,
      NODE_ENV: 'dev',
    })).toThrow(/NODE_ENV/);
  });

  it('ignores variables it does not know about', () => {
    expect(() => validateEnvironment({
      ...VALID,
      HOME: '/root',
    })).not.toThrow();
  });
});

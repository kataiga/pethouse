/**
 * Typed access to `process.env` for the `registerAs` factories. Validation (`environment.ts`) runs
 * before any factory and reports every problem at once; these helpers are the last line of defence
 * so a factory can never hand out `undefined` for a required variable.
 */

export function requireEnv (name: string): string {
  const value = process.env[name];

  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable ${name}`);
  }

  return value;
}

export function optionalEnv (name: string): string | undefined {
  const value = process.env[name];

  return value === undefined || value === '' ? undefined : value;
}

export function envWithDefault (name: string, fallback: string): string {
  return optionalEnv(name) ?? fallback;
}

export function envInt (name: string, fallback?: number): number {
  const raw = fallback === undefined ? requireEnv(name) : envWithDefault(name, String(fallback));
  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got "${raw}"`);
  }

  return parsed;
}

export function envBool (name: string, fallback: boolean): boolean {
  return envWithDefault(name, String(fallback)) === 'true';
}

export function envList (name: string): string[] {
  return (optionalEnv(name) ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const UNIT_SECONDS: Record<string, number> = {
  ms: 0.001,
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

const DURATION = /^(\d+)(ms|s|m|h|d)$/;

/** `15m` -> 900, `30d` -> 2592000. The format is validated at boot by `environment.ts`. */
export function durationToSeconds (value: string): number {
  const match = DURATION.exec(value);

  if (!match) {
    throw new Error(`Invalid duration "${value}", expected <number><ms|s|m|h|d>`);
  }

  return Math.round(Number(match[1]) * UNIT_SECONDS[match[2]]);
}

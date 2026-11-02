/** Outside the acceptable range; a missing bound does not constrain. */
export function isOutOfRange (value: number, min: number | null, max: number | null): boolean {
  return (min !== null && value < min) || (max !== null && value > max);
}

/** A value with exactly the definition's decimals, in the person's language: `7,2` in French. */
export function formatValue (value: number, decimals: number, language: string): string {
  return value.toLocaleString(language, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  });
}

/** A value and its unit; dimensionless values such as pH have no unit. */
export function withUnit (formatted: string, unit: string): string {
  return unit === '' ? formatted : `${formatted} ${unit}`;
}

export type ReadingError = 'invalid' | 'tooPrecise';

export type ParsedReading = { value: number | null } | { error: ReadingError };

/**
 * A typed reading: empty is null, a decimal comma is accepted, and no more decimals than the
 * parameter keeps (a pH of 7.25 on a one-decimal parameter is a typo, not a measurement).
 */
export function parseReading (text: string, decimals: number): ParsedReading {
  const trimmed = text.trim().replace(',', '.');

  if (trimmed === '') {
    return { value: null };
  }

  const match = /^-?\d+(?:\.(\d+))?$/.exec(trimmed);

  if (!match) {
    return { error: 'invalid' };
  }

  if ((match[1]?.length ?? 0) > decimals) {
    return { error: 'tooPrecise' };
  }

  return { value: Number(trimmed) };
}

export interface ThresholdPair {
  min: number | null;
  max: number | null;
}

export type ThresholdError = ReadingError | 'inverted';

/** Both bounds of a range from text; each may be left empty. */
export function parseThresholds (minText: string, maxText: string, decimals: number):
{ ok: true;
  value: ThresholdPair } | { ok: false;
    minError?: ThresholdError;
    maxError?: ThresholdError } {
  const min = parseReading(minText, decimals);
  const max = parseReading(maxText, decimals);

  if ('error' in min || 'error' in max) {
    return {
      ok: false,
      ...('error' in min ? { minError: min.error } : {}),
      ...('error' in max ? { maxError: max.error } : {}),
    };
  }

  if (min.value !== null && max.value !== null && min.value > max.value) {
    return {
      ok: false,
      maxError: 'inverted',
    };
  }

  return {
    ok: true,
    value: {
      min: min.value,
      max: max.value,
    },
  };
}

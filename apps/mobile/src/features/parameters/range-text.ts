import type { TFunction } from 'i18next';
import {
  formatValue, withUnit,
} from './range';

/** « 6,5 – 7,5 », « ≥ 22 °C », or « Pas de seuil ». */
export function rangeText (
  min: number | null,
  max: number | null,
  definition: { decimals: number;
    unit: string },
  t: TFunction,
  language: string,
): string {
  const show = (value: number): string => withUnit(formatValue(value, definition.decimals, language), definition.unit);

  if (min !== null && max !== null) {
    return t('parameters.range.both', {
      min: formatValue(min, definition.decimals, language),
      max: show(max),
    });
  }

  if (min !== null) {
    return t('parameters.range.min', { min: show(min) });
  }

  return max !== null ? t('parameters.range.max', { max: show(max) }) : t('parameters.range.none');
}

import type { TFunction } from 'i18next';

const TEMPLATE_KEYS = [
  'water-change',
  'water-test',
  'feeding',
  'fertiliser',
  'glass-cleaning',
  'pruning',
  'filter-cleaning',
  'misting',
  'water-bowl',
  'spot-cleaning',
  'substrate-change',
  'uvb-replacement',
  'pump-cleaning',
] as const;

type TemplateKey = typeof TEMPLATE_KEYS[number];

function isTemplateKey (key: string): key is TemplateKey {
  return TEMPLATE_KEYS.some((known) => known === key);
}

/**
 * A template's name and description from its i18n keys (`routine.<key>.name`); an unknown key,
 * seeded after this build, falls back to the key itself rather than to nothing.
 */
export function templateTexts (nameKey: string, t: TFunction): { name: string;
  description: string } {
  const key = /^routine\.(.+)\.name$/.exec(nameKey)?.[1] ?? nameKey;

  return isTemplateKey(key)
    ? {
      name: t(`routines.templates.${key}.name`),
      description: t(`routines.templates.${key}.description`),
    }
    : {
      name: key,
      description: '',
    };
}

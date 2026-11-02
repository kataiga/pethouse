import type { TFunction } from 'i18next';
import type { Definition } from './hooks/use-definitions';

const SYSTEM_SLUGS = [
  'temperature',
  'humidity',
  'ph',
  'kh',
  'gh',
  'nh4',
  'no2',
  'no3',
  'po4',
  'tds',
  'salinity',
] as const;

type SystemSlug = typeof SYSTEM_SLUGS[number];

function isSystemSlug (slug: string): slug is SystemSlug {
  return SYSTEM_SLUGS.some((known) => known === slug);
}

/** Seeded parameters are translated from their slug; a household's own keeps its name. */
export function definitionLabel (definition: Pick<Definition, 'slug' | 'name' | 'isSystem'>, t: TFunction): string {
  return definition.isSystem && isSystemSlug(definition.slug)
    ? t(`parameters.names.${definition.slug}`)
    : definition.name;
}

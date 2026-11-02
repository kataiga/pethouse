import type Ionicons from '@expo/vector-icons/Ionicons';
import type { TFunction } from 'i18next';
import type { Subtype } from './hooks/use-subtypes';
import type { TankType } from './hooks/use-tanks';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const TANK_ICONS: Record<TankType, IconName> = {
  AQUARIUM: 'fish-outline',
  TERRARIUM: 'leaf-outline',
  PALUDARIUM: 'water-outline',
};

const SYSTEM_SLUGS = [
  'freshwater',
  'planted',
  'shrimp',
  'biotope',
  'coldwater',
  'brackish',
  'reef',
  'marine-fish-only',
  'desert',
  'tropical',
  'arboreal',
  'temperate',
  'bioactive',
  'riparium',
  'aquaterrarium',
  'dart-frog',
  'mangrove',
] as const;

type SystemSlug = typeof SYSTEM_SLUGS[number];

function isSystemSlug (slug: string): slug is SystemSlug {
  return SYSTEM_SLUGS.some((known) => known === slug);
}

/** Seeded subtypes are translated from their slug; a household's own keeps the name it was given. */
export function subtypeLabel (subtype: Pick<Subtype, 'slug' | 'name' | 'isSystem'>, t: TFunction): string {
  return subtype.isSystem && isSystemSlug(subtype.slug) ? t(`tanks.subtypes.${subtype.slug}`) : subtype.name;
}

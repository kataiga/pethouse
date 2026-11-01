import { TankType } from '@common/enums/tank-type.enum';

export interface SystemTankSubtype {
  tankType: TankType;
  slug: string;
  name: string;
}

/** The seeded list every household starts from. Slugs are stable keys the app translates. */
export const SYSTEM_TANK_SUBTYPES: readonly SystemTankSubtype[] = [
  {
    tankType: TankType.AQUARIUM,
    slug: 'freshwater',
    name: 'Freshwater',
  },
  {
    tankType: TankType.AQUARIUM,
    slug: 'planted',
    name: 'Planted',
  },
  {
    tankType: TankType.AQUARIUM,
    slug: 'shrimp',
    name: 'Shrimp',
  },
  {
    tankType: TankType.AQUARIUM,
    slug: 'biotope',
    name: 'Biotope',
  },
  {
    tankType: TankType.AQUARIUM,
    slug: 'coldwater',
    name: 'Coldwater',
  },
  {
    tankType: TankType.AQUARIUM,
    slug: 'brackish',
    name: 'Brackish',
  },
  {
    tankType: TankType.AQUARIUM,
    slug: 'reef',
    name: 'Reef',
  },
  {
    tankType: TankType.AQUARIUM,
    slug: 'marine-fish-only',
    name: 'Marine fish only',
  },
  {
    tankType: TankType.TERRARIUM,
    slug: 'desert',
    name: 'Desert',
  },
  {
    tankType: TankType.TERRARIUM,
    slug: 'tropical',
    name: 'Tropical',
  },
  {
    tankType: TankType.TERRARIUM,
    slug: 'arboreal',
    name: 'Arboreal',
  },
  {
    tankType: TankType.TERRARIUM,
    slug: 'temperate',
    name: 'Temperate',
  },
  {
    tankType: TankType.TERRARIUM,
    slug: 'bioactive',
    name: 'Bioactive',
  },
  {
    tankType: TankType.PALUDARIUM,
    slug: 'riparium',
    name: 'Riparium',
  },
  {
    tankType: TankType.PALUDARIUM,
    slug: 'aquaterrarium',
    name: 'Aquaterrarium',
  },
  {
    tankType: TankType.PALUDARIUM,
    slug: 'dart-frog',
    name: 'Dart frog',
  },
  {
    tankType: TankType.PALUDARIUM,
    slug: 'mangrove',
    name: 'Mangrove',
  },
];

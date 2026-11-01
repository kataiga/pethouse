import { TankType } from '@common/enums/tank-type.enum';

export interface ParameterDefault {
  enabled: boolean;
  displayOrder: number;
  minThreshold: number | null;
  maxThreshold: number | null;
}

export interface SystemParameterDefinition {
  /** Stable key the app translates. */
  slug: string;
  /** English label, used as is for custom definitions and as a fallback. */
  name: string;
  unit: string;
  decimals: number;
  /** What an account sees for a tank type before it changes anything. Missing type = disabled. */
  defaults: Partial<Record<TankType, ParameterDefault>>;
}

function on (displayOrder: number, minThreshold: number | null, maxThreshold: number | null): ParameterDefault {
  return {
    enabled: true,
    displayOrder,
    minThreshold,
    maxThreshold,
  };
}

/** The seeded parameter list. Thresholds are the usual community-tank ranges, not a verdict. */
export const SYSTEM_PARAMETER_DEFINITIONS: readonly SystemParameterDefinition[] = [
  {
    slug: 'temperature',
    name: 'Temperature',
    unit: '°C',
    decimals: 1,
    defaults: {
      [TankType.AQUARIUM]: on(10, 22, 28),
      [TankType.TERRARIUM]: on(10, 24, 32),
      [TankType.PALUDARIUM]: on(10, 22, 28),
    },
  },
  {
    slug: 'humidity',
    name: 'Humidity',
    unit: '%',
    decimals: 0,
    defaults: {
      [TankType.TERRARIUM]: on(20, 40, 80),
      [TankType.PALUDARIUM]: on(20, 60, 90),
    },
  },
  {
    slug: 'ph',
    name: 'pH',
    unit: '',
    decimals: 1,
    defaults: {
      [TankType.AQUARIUM]: on(30, 6.5, 7.5),
      [TankType.PALUDARIUM]: on(30, 6, 7.5),
    },
  },
  {
    slug: 'kh',
    name: 'Carbonate hardness',
    unit: '°dKH',
    decimals: 1,
    defaults: { [TankType.AQUARIUM]: on(40, 3, 10) },
  },
  {
    slug: 'gh',
    name: 'General hardness',
    unit: '°dGH',
    decimals: 1,
    defaults: { [TankType.AQUARIUM]: on(50, 4, 12) },
  },
  {
    slug: 'nh4',
    name: 'Ammonium',
    unit: 'mg/L',
    decimals: 2,
    defaults: {
      [TankType.AQUARIUM]: on(60, 0, 0.1),
      [TankType.PALUDARIUM]: on(60, 0, 0.1),
    },
  },
  {
    slug: 'no2',
    name: 'Nitrite',
    unit: 'mg/L',
    decimals: 2,
    defaults: {
      [TankType.AQUARIUM]: on(70, 0, 0.2),
      [TankType.PALUDARIUM]: on(70, 0, 0.2),
    },
  },
  {
    slug: 'no3',
    name: 'Nitrate',
    unit: 'mg/L',
    decimals: 1,
    defaults: {
      [TankType.AQUARIUM]: on(80, 0, 30),
      [TankType.PALUDARIUM]: on(80, 0, 30),
    },
  },
  {
    slug: 'po4',
    name: 'Phosphate',
    unit: 'mg/L',
    decimals: 2,
    defaults: {},
  },
  {
    slug: 'tds',
    name: 'Total dissolved solids',
    unit: 'ppm',
    decimals: 0,
    defaults: {},
  },
  {
    slug: 'salinity',
    name: 'Salinity',
    unit: 'ppt',
    decimals: 1,
    defaults: {},
  },
];

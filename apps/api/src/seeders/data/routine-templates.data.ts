import { TankType } from '@common/enums/tank-type.enum';

export interface RoutineTemplateSeed {
  tankType: TankType;
  /** Short key; the i18n keys are `routine.<key>.name` and `routine.<key>.description`. */
  key: string;
  rrule: string;
}

/**
 * Suggested routines per tank type, in display order. Times are typical defaults the user moves;
 * the app pairs the rule with a local start date when the routine is saved.
 */
export const ROUTINE_TEMPLATES: readonly RoutineTemplateSeed[] = [
  {
    tankType: TankType.AQUARIUM,
    key: 'water-change',
    rrule: 'FREQ=WEEKLY;BYDAY=SA;BYHOUR=10;BYMINUTE=0',
  },
  {
    tankType: TankType.AQUARIUM,
    key: 'water-test',
    rrule: 'FREQ=WEEKLY;BYDAY=SA;BYHOUR=9;BYMINUTE=30',
  },
  {
    tankType: TankType.AQUARIUM,
    key: 'feeding',
    rrule: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
  },
  {
    tankType: TankType.AQUARIUM,
    key: 'fertiliser',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,TH;BYHOUR=19;BYMINUTE=0',
  },
  {
    tankType: TankType.AQUARIUM,
    key: 'glass-cleaning',
    rrule: 'FREQ=WEEKLY;BYDAY=WE;BYHOUR=19;BYMINUTE=0',
  },
  {
    tankType: TankType.AQUARIUM,
    key: 'pruning',
    rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=SU;BYHOUR=11;BYMINUTE=0',
  },
  {
    tankType: TankType.AQUARIUM,
    key: 'filter-cleaning',
    rrule: 'FREQ=MONTHLY;BYDAY=1SA;BYHOUR=10;BYMINUTE=30',
  },
  {
    tankType: TankType.TERRARIUM,
    key: 'misting',
    rrule: 'FREQ=DAILY;BYHOUR=8,20;BYMINUTE=0',
  },
  {
    tankType: TankType.TERRARIUM,
    key: 'water-bowl',
    rrule: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=30',
  },
  {
    tankType: TankType.TERRARIUM,
    key: 'feeding',
    rrule: 'FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0',
  },
  {
    tankType: TankType.TERRARIUM,
    key: 'spot-cleaning',
    rrule: 'FREQ=WEEKLY;BYDAY=SU;BYHOUR=11;BYMINUTE=0',
  },
  {
    tankType: TankType.TERRARIUM,
    key: 'substrate-change',
    rrule: 'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1;BYHOUR=10;BYMINUTE=0',
  },
  {
    tankType: TankType.TERRARIUM,
    key: 'uvb-replacement',
    rrule: 'FREQ=MONTHLY;INTERVAL=6;BYMONTHDAY=1;BYHOUR=10;BYMINUTE=0',
  },
  {
    tankType: TankType.PALUDARIUM,
    key: 'misting',
    rrule: 'FREQ=DAILY;BYHOUR=8,20;BYMINUTE=0',
  },
  {
    tankType: TankType.PALUDARIUM,
    key: 'feeding',
    rrule: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
  },
  {
    tankType: TankType.PALUDARIUM,
    key: 'water-test',
    rrule: 'FREQ=WEEKLY;BYDAY=SA;BYHOUR=9;BYMINUTE=30',
  },
  {
    tankType: TankType.PALUDARIUM,
    key: 'water-change',
    rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=SA;BYHOUR=10;BYMINUTE=0',
  },
  {
    tankType: TankType.PALUDARIUM,
    key: 'glass-cleaning',
    rrule: 'FREQ=WEEKLY;BYDAY=WE;BYHOUR=19;BYMINUTE=0',
  },
  {
    tankType: TankType.PALUDARIUM,
    key: 'pruning',
    rrule: 'FREQ=MONTHLY;BYDAY=1SU;BYHOUR=11;BYMINUTE=0',
  },
  {
    tankType: TankType.PALUDARIUM,
    key: 'pump-cleaning',
    rrule: 'FREQ=MONTHLY;BYDAY=1SA;BYHOUR=10;BYMINUTE=30',
  },
];

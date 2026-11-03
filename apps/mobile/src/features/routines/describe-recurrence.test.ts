import { i18n } from '@/lib/i18n';
import { describeRecurrence } from './describe-recurrence';
import { parseRecurrence } from './recurrence';

const START = '2026-11-02';

function describe_ (rrule: string, language: string): string {
  const recurrence = parseRecurrence(rrule, `${START}T09:00`);

  if (!recurrence) {
    throw new Error(`Unsupported ${rrule}`);
  }

  return describeRecurrence(recurrence, START, i18n.getFixedT(language), language);
}

describe('describeRecurrence', () => {
  it.each([
    ['FREQ=DAILY;BYHOUR=8,20;BYMINUTE=0', 'Tous les jours à 08:00 et 20:00', 'Every day at 08:00 and 20:00'],
    ['FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0', 'Tous les 2 jours à 19:00', 'Every 2 days at 19:00'],
    [
      'FREQ=WEEKLY;BYDAY=SA;BYHOUR=10;BYMINUTE=0',
      'Chaque semaine le samedi à 10:00',
      'Every week on Saturday at 10:00',
    ],
    [
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;BYHOUR=7;BYMINUTE=30',
      'Toutes les 2 semaines le lundi, mercredi et vendredi à 07:30',
      'Every 2 weeks on Monday, Wednesday and Friday at 07:30',
    ],
    ['FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=10;BYMINUTE=0', 'Chaque mois le 1er à 10:00', 'Every month on the 1st at 10:00'],
    [
      'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=22;BYHOUR=10;BYMINUTE=0',
      'Tous les 3 mois le 22 à 10:00',
      'Every 3 months on the 22nd at 10:00',
    ],
    [
      'FREQ=MONTHLY;BYDAY=-1SU;BYHOUR=11;BYMINUTE=0',
      'Chaque mois le dernier dimanche à 11:00',
      'Every month on the last Sunday at 11:00',
    ],
    ['FREQ=YEARLY;BYHOUR=9;BYMINUTE=0', 'Chaque année le 2 novembre à 09:00', 'Every year on November 2 at 09:00'],
    [
      'FREQ=WEEKLY;BYDAY=SA,WE;BYHOUR=10;BYMINUTE=0',
      'Chaque semaine le mercredi et samedi à 10:00',
      'Every week on Wednesday and Saturday at 10:00',
    ],
  ])('%p', (rrule, french, english) => {
    expect(describe_(rrule, 'fr')).toBe(french);
    expect(describe_(rrule, 'en')).toBe(english);
  });
});

import type { TFunction } from 'i18next';
import { dateFromCalendar } from '@/lib/i18n/format';
import {
  type Recurrence, timeText, WEEKDAYS,
} from './recurrence';

/** « a », « a et b », « a, b et c ». */
function listText (items: readonly string[], t: TFunction): string {
  if (items.length <= 1) {
    return items[0] ?? '';
  }

  const head = items.slice(0, -1).join(t('routines.recurrence.comma'));

  return `${head}${t('routines.recurrence.and')}${items.at(-1) ?? ''}`;
}

function englishOrdinal (day: number): string {
  const tens = day % 100;

  if (tens >= 11 && tens <= 13) {
    return `${day}th`;
  }

  return `${day}${['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'}`;
}

function monthlyWhen (recurrence: Recurrence, t: TFunction, language: string): string {
  const { monthly } = recurrence;

  if (monthly.kind === 'weekdayOfMonth') {
    return t('routines.recurrence.onWeekday', {
      ordinal: t(`routines.recurrence.ordinals.${monthly.ordinal}`),
      weekday: t(`routines.recurrence.weekdayNames.${monthly.weekday}`),
    });
  }

  if (monthly.day === 1) {
    return t('routines.recurrence.onFirstDay');
  }

  const day = language.startsWith('en') ? englishOrdinal(monthly.day) : String(monthly.day);

  return t('routines.recurrence.onDay', { day });
}

/** The rule as a sentence: « Toutes les 2 semaines le lundi et jeudi à 19:00 ». */
export function describeRecurrence (recurrence: Recurrence, startDate: string, t: TFunction, language: string): string {
  const count = recurrence.interval;
  const many = count > 1;
  let rule: string;

  switch (recurrence.frequency) {
    case 'DAILY':
      rule = many ? t('routines.recurrence.dailyEvery', { count }) : t('routines.recurrence.daily');
      break;
    case 'WEEKLY': {
      const days = listText(WEEKDAYS
        .filter((day) => recurrence.weekdays.includes(day))
        .map((day) => t(`routines.recurrence.weekdayNames.${day}`)), t);
      rule = many
        ? t('routines.recurrence.weeklyEvery', {
          count,
          days,
        })
        : t('routines.recurrence.weekly', { days });
      break;
    }
    case 'MONTHLY': {
      const when = monthlyWhen(recurrence, t, language);
      rule = many
        ? t('routines.recurrence.monthlyEvery', {
          count,
          when,
        })
        : t('routines.recurrence.monthly', { when });
      break;
    }
    case 'YEARLY': {
      const date = dateFromCalendar(startDate).toLocaleDateString(language, {
        day: 'numeric',
        month: 'long',
      });
      rule = many
        ? t('routines.recurrence.yearlyEvery', {
          count,
          date,
        })
        : t('routines.recurrence.yearly', { date });
      break;
    }
  }

  const times = [...recurrence.times].sort((a, b) => a.hour - b.hour || a.minute - b.minute).map(timeText);

  return times.length === 0 ? rule : t('routines.recurrence.at', {
    rule,
    times: listText(times, t),
  });
}

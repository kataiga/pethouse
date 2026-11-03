import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { dateFromCalendar } from '@/lib/i18n/format';
import { space } from '@/theme';
import { describeRecurrence } from '../describe-recurrence';
import {
  defaultRecurrence, FREQUENCIES, type Frequency, type MonthlyRule, ORDINALS, type Recurrence, recurrenceError,
  WEEKDAYS,
} from '../recurrence';
import type { RuleDraft } from '../routine-form';
import { TimeList } from './time-list';
import { WeekdayPicker } from './weekday-picker';

export interface RecurrenceEditorProps {
  value: RuleDraft;
  startDate: string;
  onChange: (value: RuleDraft) => void;
  /** Show the rule's problems even before the person touched it, once they tried to save. */
  showErrors: boolean;
}

type MonthlyKind = MonthlyRule['kind'];

/** Whole numbers typed as text; anything else becomes 0, which the rule check refuses. */
function wholeNumber (text: string): number {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : 0;
}

function Editor ({ recurrence, startDate, onChange, showErrors }: { recurrence: Recurrence;
  startDate: string;
  onChange: (recurrence: Recurrence) => void;
  showErrors: boolean }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [intervalText, setIntervalText] = useState(String(recurrence.interval));
  const [dayText, setDayText] = useState(String(recurrence.monthly.kind === 'dayOfMonth' ? recurrence.monthly.day : 1));
  const [touched, setTouched] = useState(false);
  const error = recurrenceError(recurrence);
  const change = (next: Recurrence): void => {
    setTouched(true);
    onChange(next);
  };
  const { monthly } = recurrence;

  return (
    <View style={styles.block}>
      <AppText testID="recurrence-summary" tone="lagon" variant="strong">
        {error === null ? describeRecurrence(recurrence, startDate, t, i18n.language) : ' '}
      </AppText>
      <SegmentedControl<Frequency>
        label={t('routines.recurrence.frequency')}
        onChange={(frequency) => {
          const base = defaultRecurrence(frequency, dateFromCalendar(startDate));
          change({
            ...recurrence,
            frequency,
            weekdays: recurrence.weekdays.length > 0 ? recurrence.weekdays : base.weekdays,
          });
        }}
        options={FREQUENCIES.map((frequency) => ({
          value: frequency,
          label: t(`routines.recurrence.frequencies.${frequency}`),
        }))}
        testID="frequency"
        value={recurrence.frequency}
      />
      <TextField
        error={error === 'interval' ? t('routines.recurrence.errors.interval') : undefined}
        inputMode="numeric"
        keyboardType="number-pad"
        label={t('routines.recurrence.interval')}
        maxLength={2}
        onChangeText={(text) => {
          setIntervalText(text);
          change({
            ...recurrence,
            interval: wholeNumber(text),
          });
        }}
        placeholder={t('routines.recurrence.intervalHint')}
        testID="interval"
        value={intervalText}
      />
      {recurrence.frequency === 'WEEKLY' ? (
        <View style={styles.block}>
          <AppText tone="soft" variant="label">{t('routines.recurrence.weekdays')}</AppText>
          <WeekdayPicker
            onChange={(weekdays) => change({
              ...recurrence,
              weekdays,
            })}
            value={recurrence.weekdays}
          />
          {error === 'noWeekday' && (touched || showErrors)
            ? <AppText tone="ambre">{t('routines.recurrence.errors.noWeekday')}</AppText>
            : null}
        </View>
      ) : null}
      {recurrence.frequency === 'MONTHLY' ? (
        <View style={styles.block}>
          <SegmentedControl<MonthlyKind>
            label={t('routines.recurrence.monthlyMode')}
            onChange={(kind) => change({
              ...recurrence,
              monthly: kind === 'dayOfMonth'
                ? {
                  kind,
                  day: wholeNumber(dayText),
                }
                : {
                  kind,
                  ordinal: 1,
                  weekday: WEEKDAYS[(dateFromCalendar(startDate).getDay() + 6) % 7] ?? 'MO',
                },
            })}
            options={[
              {
                value: 'dayOfMonth',
                label: t('routines.recurrence.dayOfMonth'),
              },
              {
                value: 'weekdayOfMonth',
                label: t('routines.recurrence.weekdayOfMonth'),
              },
            ]}
            testID="monthly-kind"
            value={monthly.kind}
          />
          {monthly.kind === 'dayOfMonth' ? (
            <>
              <TextField
                error={error === 'monthDay' ? t('routines.recurrence.errors.monthDay') : undefined}
                inputMode="numeric"
                keyboardType="number-pad"
                label={t('routines.recurrence.day')}
                maxLength={2}
                onChangeText={(text) => {
                  setDayText(text);
                  change({
                    ...recurrence,
                    monthly: {
                      kind: 'dayOfMonth',
                      day: wholeNumber(text),
                    },
                  });
                }}
                testID="month-day"
                value={dayText}
              />
              {monthly.day > 28
                ? <AppText tone="soft" variant="caption">{t('routines.recurrence.monthDayHint')}</AppText>
                : null}
            </>
          ) : (
            <>
              <AppText tone="soft" variant="label">{t('routines.recurrence.ordinal')}</AppText>
              <View accessibilityRole="radiogroup" style={styles.chips}>
                {ORDINALS.map((ordinal) => (
                  <Chip
                    key={ordinal}
                    label={t(`routines.recurrence.ordinals.${ordinal}`)}
                    onPress={() => change({
                      ...recurrence,
                      monthly: {
                        ...monthly,
                        ordinal,
                      },
                    })}
                    selected={monthly.ordinal === ordinal}
                    testID={`ordinal-${ordinal}`}
                  />
                ))}
              </View>
              <AppText tone="soft" variant="label">{t('routines.recurrence.weekday')}</AppText>
              <View accessibilityRole="radiogroup" style={styles.chips}>
                {WEEKDAYS.map((weekday) => (
                  <Chip
                    key={weekday}
                    label={t(`routines.recurrence.weekdayNames.${weekday}`)}
                    onPress={() => change({
                      ...recurrence,
                      monthly: {
                        ...monthly,
                        weekday,
                      },
                    })}
                    selected={monthly.weekday === weekday}
                    testID={`month-weekday-${weekday}`}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      ) : null}
      <View style={styles.block}>
        <AppText tone="soft" variant="label">{t('routines.recurrence.times')}</AppText>
        <TimeList
          onChange={(times) => change({
            ...recurrence,
            times,
          })}
          value={recurrence.times}
        />
        {error === 'mixedMinutes' || error === 'noTime'
          ? <AppText tone="ambre">{t(`routines.recurrence.errors.${error}`)}</AppText>
          : null}
      </View>
    </View>
  );
}

/**
 * The rule as a person thinks of it: how often, which days, at what times. A rule made
 * elsewhere that the editor cannot show stays untouched until it is replaced on purpose.
 */
export function RecurrenceEditor ({
  value, startDate, onChange, showErrors,
}: RecurrenceEditorProps): React.JSX.Element {
  const { t } = useTranslation();

  if (value.kind === 'custom') {
    return (
      <View style={styles.block}>
        <AppText variant="strong">{t('routines.recurrence.custom', { rule: value.rrule })}</AppText>
        <AppText tone="soft">{t('routines.recurrence.customExplain')}</AppText>
        <Button
          label={t('routines.recurrence.replace')}
          onPress={() => onChange({
            kind: 'editor',
            recurrence: defaultRecurrence('WEEKLY', dateFromCalendar(startDate)),
          })}
          testID="recurrence-replace"
          variant="soft"
        />
      </View>
    );
  }

  return (
    <Editor
      onChange={(recurrence) => onChange({
        kind: 'editor',
        recurrence,
      })}
      recurrence={value.recurrence}
      showErrors={showErrors}
      startDate={startDate}
    />
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});

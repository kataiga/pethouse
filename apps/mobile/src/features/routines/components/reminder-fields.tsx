import { useTranslation } from 'react-i18next';
import {
  StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Toggle } from '@/components/ui/toggle';
import { space } from '@/theme';
import {
  MAX_REMINDERS, REMINDER_INTERVALS, type ReminderInterval,
} from '../routine-form';

export interface ReminderFieldsProps {
  remind: boolean;
  every: ReminderInterval;
  max: number;
  onChange: (value: { remind: boolean;
    every: ReminderInterval;
    max: number }) => void;
}

/** Whether the household is nudged again while a due task stays undone, how often, how many times. */
export function ReminderFields ({
  remind, every, max, onChange,
}: ReminderFieldsProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.block}>
      <Toggle
        label={t('routines.reminders.toggle')}
        onChange={(next) => onChange({
          remind: next,
          every,
          max,
        })}
        testID="reminders-enabled"
        value={remind}
      />
      {remind ? (
        <>
          <AppText tone="soft" variant="label">{t('routines.reminders.every')}</AppText>
          <View accessibilityRole="radiogroup" style={styles.chips}>
            {REMINDER_INTERVALS.map((minutes) => (
              <Chip
                key={minutes}
                label={t(`routines.reminders.intervals.${minutes}`)}
                onPress={() => onChange({
                  remind,
                  every: minutes,
                  max,
                })}
                selected={every === minutes}
                testID={`reminders-every-${minutes}`}
              />
            ))}
          </View>
          <AppText tone="soft" variant="label">{t('routines.reminders.max')}</AppText>
          <View style={styles.stepper}>
            <Button
              disabled={max <= 1}
              label="−"
              onPress={() => onChange({
                remind,
                every,
                max: max - 1,
              })}
              testID="reminders-fewer"
              variant="soft"
            />
            <AppText testID="reminders-max" variant="title">{String(max)}</AppText>
            <Button
              disabled={max >= MAX_REMINDERS}
              label="+"
              onPress={() => onChange({
                remind,
                every,
                max: max + 1,
              })}
              testID="reminders-more"
              variant="soft"
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
  },
});

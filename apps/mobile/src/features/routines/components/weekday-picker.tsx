import { useTranslation } from 'react-i18next';
import {
  Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import {
  radius, space, useTheme,
} from '@/theme';
import {
  type Weekday, WEEKDAYS,
} from '../recurrence';

export interface WeekdayPickerProps {
  value: readonly Weekday[];
  onChange: (value: Weekday[]) => void;
}

/** Monday to Sunday as seven round toggles; several may be on. */
export function WeekdayPicker ({ value, onChange }: WeekdayPickerProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      {WEEKDAYS.map((day) => {
        const selected = value.includes(day);

        return (
          <Pressable
            accessibilityLabel={t(`routines.recurrence.weekdayNames.${day}`)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            key={day}
            // Kept in week order whatever the order of the taps: the sentence reads Monday first.
            onPress={() => onChange(WEEKDAYS.filter((candidate) => (candidate === day
              ? !selected
              : value.includes(candidate))))}
            style={[styles.day, {
              backgroundColor: selected ? colors.lagon : colors.surface,
              borderColor: selected ? colors.lagon : colors.line,
            }]}
            testID={`weekday-${day}`}
          >
            <AppText tone={selected ? 'onLagon' : 'default'} variant="strong">
              {t(`routines.recurrence.weekdayInitials.${day}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.xs,
  },
  day: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

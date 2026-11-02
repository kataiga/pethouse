import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import {
  calendarDateOf, dateFromCalendar, formatCalendarDate,
} from '@/lib/i18n/format';
import {
  radius, space, useTheme,
} from '@/theme';

export interface DateFieldProps {
  label: string;
  /** `YYYY-MM-DD`, or null when not set. */
  value: string | null;
  onChange: (value: string | null) => void;
  testID: string;
}

/** A calendar date picked with the system picker, never typed; it can be cleared. */
export function DateField ({
  label, value, onChange, testID,
}: DateFieldProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.field}>
      <AppText tone="soft" variant="label">{label}</AppText>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityValue={{ text: value === null ? undefined : formatCalendarDate(value, i18n.language) }}
          onPress={() => setOpen(true)}
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.line,
          }]}
          testID={testID}
        >
          <AppText tone={value === null ? 'soft' : 'default'}>
            {value === null ? t('tanks.form.startedAtPick') : formatCalendarDate(value, i18n.language)}
          </AppText>
        </Pressable>
        {value !== null ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={space.sm}
            onPress={() => onChange(null)}
            testID={`${testID}-clear`}
          >
            <AppText tone="lagon" variant="strong">{t('tanks.form.startedAtClear')}</AppText>
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          maximumDate={new Date()}
          mode="date"
          onChange={(event, date) => {
            setOpen(false);
            if (event.type === 'set' && date) {
              onChange(calendarDateOf(date));
            }
          }}
          testID={`${testID}-picker`}
          value={value === null ? new Date() : dateFromCalendar(value)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  input: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
  },
});

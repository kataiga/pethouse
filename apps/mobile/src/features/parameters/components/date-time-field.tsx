import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import {
  radius, space, useTheme,
} from '@/theme';

export interface DateTimeFieldProps {
  value: Date;
  onChange: (value: Date) => void;
  testID: string;
}

/**
 * A moment in the past, picked as a date then a time: Android has no combined picker. Each part
 * keeps the other as it was.
 */
export function DateTimeField ({ value, onChange, testID }: DateTimeFieldProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState<'date' | 'time' | null>(null);
  const box = [styles.input, {
    backgroundColor: colors.surface,
    borderColor: colors.line,
  }];

  return (
    <View style={styles.row}>
      <View style={styles.date}>
        <AppText tone="soft" variant="label">{t('parameters.measure.date')}</AppText>
        <Pressable accessibilityRole="button" onPress={() => setOpen('date')} style={box} testID={`${testID}-date`}>
          <AppText>{value.toLocaleDateString(i18n.language, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}</AppText>
        </Pressable>
      </View>
      <View style={styles.time}>
        <AppText tone="soft" variant="label">{t('parameters.measure.time')}</AppText>
        <Pressable accessibilityRole="button" onPress={() => setOpen('time')} style={box} testID={`${testID}-time`}>
          <AppText>{value.toLocaleTimeString(i18n.language, {
            hour: '2-digit',
            minute: '2-digit',
          })}</AppText>
        </Pressable>
      </View>
      {open ? (
        <DateTimePicker
          maximumDate={new Date()}
          mode={open}
          onChange={(event, picked) => {
            const part = open;
            setOpen(null);
            if (event.type !== 'set' || !picked) {
              return;
            }

            const next = new Date(value);
            if (part === 'date') {
              next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
            } else {
              next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
            }
            onChange(next);
          }}
          testID={`${testID}-picker`}
          value={value}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.sm,
  },
  date: {
    flex: 2,
    gap: space.xs,
  },
  time: {
    flex: 1,
    gap: space.xs,
  },
  input: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
  },
});

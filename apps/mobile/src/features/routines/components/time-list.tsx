import Ionicons from '@expo/vector-icons/Ionicons';
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
import {
  MAX_TIMES, type TimeOfDay, timeText,
} from '../recurrence';

export interface TimeListProps {
  value: readonly TimeOfDay[];
  onChange: (value: TimeOfDay[]) => void;
}

/** The times of day an occurrence falls on, picked with the system time picker. */
export function TimeList ({ value, onChange }: TimeListProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  /** Index being edited; `value.length` adds a new one. */
  const [editing, setEditing] = useState<number | null>(null);
  const current = editing === null ? undefined : value[editing];
  const pickerValue = new Date();
  pickerValue.setHours(current?.hour ?? 9, current?.minute ?? 0, 0, 0);

  return (
    <View style={styles.list}>
      {value.map((time, index) => (
        <View key={`${timeText(time)}-${index}`} style={[styles.chip, {
          backgroundColor: colors.lagonVeil,
        }]}>
          <Pressable accessibilityRole="button" onPress={() => setEditing(index)} testID={`time-${index}`}>
            <AppText tone="lagon" variant="strong">{timeText(time)}</AppText>
          </Pressable>
          {value.length > 1 ? (
            <Pressable
              accessibilityLabel={t('routines.recurrence.removeTime', { time: timeText(time) })}
              accessibilityRole="button"
              hitSlop={space.sm}
              onPress={() => onChange(value.filter((_kept, kept) => kept !== index))}
              testID={`time-${index}-remove`}
            >
              <Ionicons color={colors.lagon} name="close" size={16} />
            </Pressable>
          ) : null}
        </View>
      ))}
      {value.length < MAX_TIMES ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditing(value.length)}
          style={[styles.chip, {
            borderColor: colors.line,
            borderWidth: 1,
          }]}
          testID="time-add"
        >
          <AppText tone="lagon" variant="strong">{t('routines.recurrence.addTime')}</AppText>
        </Pressable>
      ) : null}
      {editing !== null ? (
        <DateTimePicker
          is24Hour
          mode="time"
          onChange={(event, picked) => {
            const index = editing;
            setEditing(null);
            if (event.type !== 'set' || !picked) {
              return;
            }

            const time = {
              hour: picked.getHours(),
              minute: picked.getMinutes(),
            };
            const next = [...value];
            next[index] = time;
            onChange(next.sort((a, b) => a.hour - b.hour || a.minute - b.minute));
          }}
          testID="time-picker"
          value={pickerValue}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
});

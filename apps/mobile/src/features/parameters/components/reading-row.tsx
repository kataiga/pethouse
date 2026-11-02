import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { formatInstantDateTime } from '@/lib/i18n/format';
import { space } from '@/theme';
import type { Measurement } from '../hooks/use-measurements';
import {
  formatValue, isOutOfRange, parseReading, withUnit,
} from '../range';

export interface ReadingRowProps {
  measurement: Measurement;
  min: number | null;
  max: number | null;
  busy: boolean;
  onCorrect: (value: number) => void;
  onDelete: () => void;
}

/** One reading: its value against today's thresholds, who took it and when; tap to correct. */
export function ReadingRow ({
  measurement, min, max, busy, onCorrect, onDelete,
}: ReadingRowProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { definition } = measurement;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(formatValue(measurement.value, definition.decimals, i18n.language));
  const parsed = parseReading(text, definition.decimals);
  const value = 'value' in parsed ? parsed.value : null;
  const alert = isOutOfRange(measurement.value, min, max);

  const confirmDelete = (): void => {
    Alert.alert(t('parameters.history.deleteTitle'), t('parameters.history.deleteBody'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('parameters.history.delete'),
        style: 'destructive',
        onPress: onDelete,
      },
    ]);
  };

  return (
    <View style={styles.row} testID={`reading-${measurement.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.summary}
        testID={`reading-${measurement.id}-toggle`}
      >
        <View style={styles.text}>
          <AppText tone="soft" variant="caption">
            {t('parameters.history.by', {
              name: measurement.recordedBy.displayName,
              date: formatInstantDateTime(measurement.measuredAt, i18n.language),
            })}
          </AppText>
          {measurement.note !== null ? <AppText tone="soft">{measurement.note}</AppText> : null}
        </View>
        <AppText tone={alert ? 'ambre' : 'default'} variant="heading">
          {withUnit(formatValue(measurement.value, definition.decimals, i18n.language), definition.unit)}
        </AppText>
      </Pressable>
      {open ? (
        <View style={styles.editor}>
          <TextField
            error={'error' in parsed ? t(`parameters.errors.${parsed.error}`) : undefined}
            inputMode="decimal"
            keyboardType="numbers-and-punctuation"
            label={t('parameters.history.value')}
            onChangeText={setText}
            testID={`reading-${measurement.id}-value`}
            value={text}
          />
          <View style={styles.actions}>
            <Button
              disabled={busy || value === null || value === measurement.value}
              label={t('common.save')}
              onPress={() => {
                if (value !== null) {
                  onCorrect(value);
                }
              }}
              testID={`reading-${measurement.id}-save`}
              variant="soft"
            />
            <Button
              disabled={busy}
              label={t('parameters.history.delete')}
              onPress={confirmDelete}
              testID={`reading-${measurement.id}-delete`}
              variant="soft"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: space.sm },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  text: {
    flex: 1,
    gap: space.xs,
  },
  editor: {
    gap: space.sm,
    paddingTop: space.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
  },
});

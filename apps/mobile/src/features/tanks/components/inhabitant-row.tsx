import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import {
  formatCalendarDate, todayCalendarDate,
} from '@/lib/i18n/format';
import { space } from '@/theme';
import type {
  EntryChange, InhabitantEntry,
} from '../hooks/use-inhabitants';
import { parseQuantity } from '../quantity';

export interface InhabitantRowProps {
  entry: InhabitantEntry;
  busy: boolean;
  onChange: (change: EntryChange) => void;
  onDelete: () => void;
}

/** One species in the tank; tapping it opens the quantity and the way out. */
export function InhabitantRow ({
  entry, busy, onChange, onDelete,
}: InhabitantRowProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const parsed = parseQuantity(quantity);
  const removed = entry.removedAt !== null;

  const confirmDelete = (): void => {
    Alert.alert(t('tanks.inhabitants.deleteTitle'), t('tanks.inhabitants.deleteBody'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('tanks.inhabitants.delete'),
        style: 'destructive',
        onPress: onDelete,
      },
    ]);
  };

  return (
    <View style={[styles.row, removed && styles.removed]} testID={`inhabitant-${entry.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={styles.summary}
        testID={`inhabitant-${entry.id}-toggle`}
      >
        <View style={styles.names}>
          <AppText variant="heading">{entry.species.commonName}</AppText>
          <AppText style={styles.scientific} tone="soft" variant="caption">{entry.species.scientificName}</AppText>
          {entry.removedAt !== null ? (
            <AppText tone="soft" variant="caption">
              {t('tanks.inhabitants.removedOn', { date: formatCalendarDate(entry.removedAt, i18n.language) })}
            </AppText>
          ) : null}
        </View>
        <AppText tone="lagon" variant="strong">{t('tanks.inhabitants.count', { count: entry.quantity })}</AppText>
      </Pressable>
      {open ? (
        <View style={styles.editor}>
          <TextField
            error={parsed === null ? t('tanks.inhabitants.invalidQuantity') : undefined}
            inputMode="numeric"
            keyboardType="number-pad"
            label={t('tanks.inhabitants.quantity')}
            onChangeText={setQuantity}
            testID={`inhabitant-${entry.id}-quantity`}
            value={quantity}
          />
          <View style={styles.actions}>
            <Button
              disabled={busy || parsed === null || parsed === entry.quantity}
              label={t('common.save')}
              onPress={() => {
                if (parsed !== null) {
                  onChange({ quantity: parsed });
                }
              }}
              testID={`inhabitant-${entry.id}-save`}
              variant="soft"
            />
            <Button
              disabled={busy}
              label={removed ? t('tanks.inhabitants.restore') : t('tanks.inhabitants.remove')}
              onPress={() => onChange({ removedAt: removed ? null : todayCalendarDate() })}
              testID={`inhabitant-${entry.id}-${removed ? 'restore' : 'remove'}`}
              variant="soft"
            />
            <Button
              disabled={busy}
              label={t('tanks.inhabitants.delete')}
              onPress={confirmDelete}
              testID={`inhabitant-${entry.id}-delete`}
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
  removed: { opacity: 0.7 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  names: {
    flex: 1,
    gap: space.xs,
  },
  scientific: { fontStyle: 'italic' },
  editor: {
    gap: space.sm,
    paddingTop: space.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});

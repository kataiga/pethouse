import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import {
  space, useTheme,
} from '@/theme';
import {
  type InhabitantKind, useDeleteInhabitant, useInhabitants, useUpdateInhabitant,
} from '../hooks/use-inhabitants';
import { InhabitantRow } from './inhabitant-row';

export interface InhabitantSectionProps {
  tankId: number;
  kind: InhabitantKind;
}

/** Animals or plants: two sections, two catalogues, the same handling. */
export function InhabitantSection ({ tankId, kind }: InhabitantSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [showRemoved, setShowRemoved] = useState(false);
  const entries = useInhabitants(tankId, kind, showRemoved);
  const update = useUpdateInhabitant(tankId, kind);
  const remove = useDeleteInhabitant(tankId, kind);
  const busy = update.isPending || remove.isPending;
  const failed = update.isError || remove.isError;

  return (
    <Surface testID={`section-${kind}`}>
      <View style={styles.header}>
        <AppText accessibilityRole="header" tone="soft" variant="label">{t(`tanks.inhabitants.${kind}`)}</AppText>
        <Pressable
          accessibilityRole="button"
          hitSlop={space.sm}
          onPress={() => router.push(`/tanks/${tankId}/inhabitants/add?kind=${kind}`)}
          testID={`${kind}-add`}
        >
          <AppText tone="lagon" variant="strong">{t('tanks.inhabitants.add')}</AppText>
        </Pressable>
      </View>
      {entries.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
      {entries.isError ? (
        <>
          <AppText tone="ambre">{t('tanks.inhabitants.error')}</AppText>
          <Button label={t('common.retry')} onPress={() => void entries.refetch()} variant="soft" />
        </>
      ) : null}
      {failed ? <AppText tone="ambre">{t('tanks.inhabitants.failed')}</AppText> : null}
      {entries.data?.length === 0 ? (
        <AppText tone="soft">
          {kind === 'animals' ? t('tanks.inhabitants.emptyAnimals') : t('tanks.inhabitants.emptyPlants')}
        </AppText>
      ) : null}
      {entries.data?.map((entry) => (
        <InhabitantRow
          busy={busy}
          entry={entry}
          key={entry.id}
          onChange={(change) => update.mutate({
            entryId: entry.id,
            change,
          })}
          onDelete={() => remove.mutate(entry.id)}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        hitSlop={space.sm}
        onPress={() => setShowRemoved(!showRemoved)}
        testID={`${kind}-show-removed`}
      >
        <AppText tone="lagon" variant="caption">
          {showRemoved ? t('tanks.inhabitants.hideRemoved') : t('tanks.inhabitants.showRemoved')}
        </AppText>
      </Pressable>
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

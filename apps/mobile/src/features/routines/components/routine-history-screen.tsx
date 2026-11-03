import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import {
  space, useTheme,
} from '@/theme';
import { useRoutineHistory } from '../hooks/use-occurrences';
import { HistoryRow } from './history-row';

/** Every routine of the tank: who did what, when, newest first. */
export function RoutineHistoryScreen ({ tankId }: { tankId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const history = useRoutineHistory(tankId, null);
  const rows = history.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Screen testID="routine-history-screen">
      <Stack.Screen options={{ title: t('routines.history.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {history.isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
        {history.isError ? (
          <Surface>
            <AppText tone="ambre">{t('routines.history.error')}</AppText>
            <Button label={t('common.retry')} onPress={() => void history.refetch()} variant="soft" />
          </Surface>
        ) : null}
        {history.data && rows.length === 0 ? (
          <Surface>
            <AppText tone="soft">{t('routines.history.empty')}</AppText>
          </Surface>
        ) : null}
        {rows.length > 0 ? (
          <Surface>
            {rows.map((occurrence) => <HistoryRow key={occurrence.id} occurrence={occurrence} showRoutine />)}
          </Surface>
        ) : null}
        {history.hasNextPage ? (
          <Button
            label={t('routines.history.more')}
            loading={history.isFetchingNextPage}
            onPress={() => void history.fetchNextPage()}
            testID="history-more"
            variant="soft"
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space.lg,
    paddingBottom: space.xxl,
  },
});

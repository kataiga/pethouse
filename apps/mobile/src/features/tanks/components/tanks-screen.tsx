import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { useCurrentHousehold } from '@/features/households/hooks/use-households';
import { useAlertingTanks } from '@/features/parameters/hooks/use-tank-parameters';
import {
  space, useTheme,
} from '@/theme';
import { useTanks } from '../hooks/use-tanks';
import { TankCard } from './tank-card';

/** Every tank of the current household, by name. */
export function TanksScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const current = useCurrentHousehold();
  const householdId = current.household?.id ?? null;
  const tanks = useTanks(householdId);
  const sorted = [...(tanks.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const alerting = useAlertingTanks(sorted.map((tank) => tank.id));
  const failed = current.isError || tanks.isError;
  const loading = current.isPending || (householdId !== null && tanks.isPending);

  return (
    <Screen testID="tanks-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            colors={[colors.lagon]}
            onRefresh={() => void tanks.refetch()}
            refreshing={tanks.isRefetching}
            tintColor={colors.lagon}
          />
        )}
      >
        <AppText accessibilityRole="header" variant="display">{t('tanks.title')}</AppText>
        {loading && !failed ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
        {failed ? (
          <Surface>
            <AppText tone="ambre">{t('tanks.error')}</AppText>
            <Button
              label={t('common.retry')}
              onPress={() => (current.isError ? current.refetch() : void tanks.refetch())}
              variant="soft"
            />
          </Surface>
        ) : null}
        {!loading && !failed && householdId === null ? (
          <Surface>
            <AppText>{t('tanks.noHousehold')}</AppText>
          </Surface>
        ) : null}
        {tanks.data?.length === 0 ? (
          <Surface testID="tanks-empty">
            <AppText>{t('tanks.empty')}</AppText>
          </Surface>
        ) : null}
        {sorted.map((tank) => (
          <TankCard
            alerting={alerting.has(tank.id)}
            key={tank.id}
            onPress={() => router.push(`/tanks/${tank.id}`)}
            tank={tank}
          />
        ))}
        {householdId !== null && !failed ? (
          <Button label={t('tanks.add')} onPress={() => router.push('/tanks/new')} testID="tanks-add" />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: space.lg } });

import Ionicons from '@expo/vector-icons/Ionicons';
import {
  router, Stack,
} from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import {
  space, useTheme,
} from '@/theme';
import {
  type Tank, useDeleteTank, useTank,
} from '../hooks/use-tanks';
import { InhabitantSection } from './inhabitant-section';
import { PhotoStrip } from './photo-strip';
import { TankSpecs } from './tank-specs';

function TankActions ({ tank }: { tank: Tank }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const remove = useDeleteTank(tank);

  const confirmDelete = (): void => {
    Alert.alert(t('tanks.detail.deleteTitle', { name: tank.name }), t('tanks.detail.deleteBody'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('tanks.detail.delete'),
        style: 'destructive',
        onPress: () => remove.mutate(undefined, {
          onSuccess: () => router.back(),
          onError: () => Alert.alert(t('tanks.detail.deleteFailed')),
        }),
      },
    ]);
  };

  return (
    <Pressable
      accessibilityLabel={t('tanks.detail.actions')}
      accessibilityRole="button"
      hitSlop={space.sm}
      onPress={() => Alert.alert(tank.name, undefined, [
        {
          text: t('tanks.detail.edit'),
          onPress: () => router.push(`/tanks/${tank.id}/edit`),
        },
        {
          text: t('tanks.detail.delete'),
          style: 'destructive',
          onPress: confirmDelete,
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ])}
      testID="tank-actions"
    >
      <Ionicons color={colors.ink} name="ellipsis-horizontal" size={24} />
    </Pressable>
  );
}

/** One tank: what it is, its photos, and what lives in it. */
export function TankDetailScreen ({ tankId }: { tankId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tank = useTank(tankId);
  const data = tank.data;

  return (
    <Screen testID="tank-detail-screen">
      <Stack.Screen
        options={{
          title: data?.name ?? '',
          headerRight: data ? () => <TankActions tank={data} /> : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            colors={[colors.lagon]}
            onRefresh={() => void tank.refetch()}
            refreshing={tank.isRefetching}
            tintColor={colors.lagon}
          />
        )}
      >
        {tank.isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
        {tank.isError ? (
          <Surface>
            <AppText tone="ambre">{t('tanks.detail.error')}</AppText>
            <Button label={t('common.retry')} onPress={() => void tank.refetch()} variant="soft" />
          </Surface>
        ) : null}
        {data === null ? (
          <Surface>
            <AppText>{t('tanks.detail.notFound')}</AppText>
          </Surface>
        ) : null}
        {data ? (
          <>
            <TankSpecs tank={data} />
            <PhotoStrip tankId={data.id} />
            <InhabitantSection kind="animals" tankId={data.id} />
            <InhabitantSection kind="plants" tankId={data.id} />
          </>
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

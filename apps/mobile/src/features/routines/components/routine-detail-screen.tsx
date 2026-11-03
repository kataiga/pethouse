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
import { Toggle } from '@/components/ui/toggle';
import {
  space, useTheme,
} from '@/theme';
import {
  useActOnOccurrence, useOccurrences, useRoutineHistory,
} from '../hooks/use-occurrences';
import {
  type Routine, useDeleteRoutine, useRoutine, useUpdateRoutine,
} from '../hooks/use-routines';
import { REMINDER_INTERVALS } from '../routine-form';
import { ruleText } from '../rule-text';
import { HistoryRow } from './history-row';
import { OccurrenceRow } from './occurrence-row';

const RECENT = 5;

function Actions ({ tankId, routine }: { tankId: number;
  routine: Routine }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const remove = useDeleteRoutine(tankId, routine.id);

  const confirmDelete = (): void => {
    Alert.alert(t('routines.detail.deleteTitle', { name: routine.name }), t('routines.detail.deleteBody'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('routines.detail.delete'),
        style: 'destructive',
        // The header holding this menu goes away with the routine: rely on the promise.
        onPress: () => void remove.mutateAsync().then(
          () => router.back(),
          () => Alert.alert(t('routines.detail.failed')),
        ),
      },
    ]);
  };

  return (
    <Pressable
      accessibilityLabel={t('tanks.detail.actions')}
      accessibilityRole="button"
      hitSlop={space.sm}
      onPress={() => Alert.alert(routine.name, undefined, [
        {
          text: t('routines.detail.edit'),
          onPress: () => router.push(`/tanks/${tankId}/routines/${routine.id}/edit`),
        },
        {
          text: t('routines.detail.delete'),
          style: 'destructive',
          onPress: confirmDelete,
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
      ])}
      testID="routine-actions"
    >
      <Ionicons color={colors.ink} name="ellipsis-horizontal" size={24} />
    </Pressable>
  );
}

function Upcoming ({ tankId, routine }: { tankId: number;
  routine: Routine }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const occurrences = useOccurrences(tankId, routine.id);
  const act = useActOnOccurrence(tankId);
  const now = Date.now();
  const open = occurrences.data?.filter((occurrence) => occurrence.status === 'PENDING'
    || occurrence.status === 'MISSED') ?? [];

  return (
    <Surface testID="routine-upcoming">
      <AppText accessibilityRole="header" tone="soft" variant="label">{t('routines.detail.upcoming')}</AppText>
      {occurrences.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
      {occurrences.isError ? (
        <>
          <AppText tone="ambre">{t('routines.detail.error')}</AppText>
          <Button label={t('common.retry')} onPress={() => void occurrences.refetch()} variant="soft" />
        </>
      ) : null}
      {act.error ? (
        <AppText tone="ambre">
          {act.error.failure === 'conflict' ? t('routines.detail.conflict') : t('routines.detail.failed')}
        </AppText>
      ) : null}
      {occurrences.data && open.length === 0 ? <AppText tone="soft">{t('routines.detail.noUpcoming')}</AppText> : null}
      {open.map((occurrence) => (
        <OccurrenceRow
          busy={act.isPending}
          key={occurrence.id}
          occurrence={occurrence}
          onAct={(action) => act.mutate({
            occurrenceId: occurrence.id,
            action,
          })}
          overdue={Date.parse(occurrence.scheduledFor) < now}
          timezone={routine.timezone}
        />
      ))}
    </Surface>
  );
}

function Recent ({ tankId, routineId }: { tankId: number;
  routineId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const history = useRoutineHistory(tankId, routineId);
  const rows = history.data?.pages[0]?.data.slice(0, RECENT) ?? [];

  return (
    <Surface testID="routine-recent">
      <AppText accessibilityRole="header" tone="soft" variant="label">{t('routines.detail.recent')}</AppText>
      {history.isError ? <AppText tone="ambre">{t('routines.history.error')}</AppText> : null}
      {history.data && rows.length === 0 ? <AppText tone="soft">{t('routines.history.empty')}</AppText> : null}
      {rows.map((occurrence) => <HistoryRow key={occurrence.id} occurrence={occurrence} showRoutine={false} />)}
      {rows.length > 0 ? (
        <Button
          label={t('routines.detail.seeAll')}
          onPress={() => router.push(`/tanks/${tankId}/routines/history`)}
          variant="soft"
        />
      ) : null}
    </Surface>
  );
}

function Detail ({ tankId, routine }: { tankId: number;
  routine: Routine }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const update = useUpdateRoutine(tankId, routine.id);
  const every = routine.reminderRepeatMinutes;
  const offered = REMINDER_INTERVALS.find((minutes) => minutes === every);
  const reminders = every === null
    ? t('routines.reminders.off')
    : t('routines.reminders.on', {
      // An interval set outside the app is shown as it is.
      every: offered === undefined ? `${every} min` : t(`routines.reminders.intervals.${offered}`),
      max: routine.reminderMaxRepeats,
    });

  return (
    <>
      <AppText accessibilityRole="header" variant="display">{routine.name}</AppText>
      <AppText tone="lagon" variant="strong">{ruleText(routine.rrule, routine.dtstart, t, i18n.language)}</AppText>
      {routine.description !== null ? <AppText>{routine.description}</AppText> : null}
      <AppText tone="soft">{reminders}</AppText>
      <Surface>
        <Toggle
          disabled={update.isPending}
          label={t('routines.detail.active')}
          onChange={(isActive) => update.mutate({ isActive })}
          testID="routine-active"
          value={routine.isActive}
        />
        {!routine.isActive ? <AppText tone="soft" variant="caption">{t('routines.detail.pauseHint')}</AppText> : null}
        {update.isError ? <AppText tone="ambre">{t('routines.detail.failed')}</AppText> : null}
      </Surface>
      {routine.isActive ? <Upcoming routine={routine} tankId={tankId} /> : null}
      <Recent routineId={routine.id} tankId={tankId} />
    </>
  );
}

/** One routine: its rule, what is due, done and skipped; deep links from notifications land here. */
export function RoutineDetailScreen ({ tankId, routineId }: { tankId: number;
  routineId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const routine = useRoutine(tankId, routineId);
  const data = routine.data;

  return (
    <Screen testID="routine-detail-screen">
      <Stack.Screen
        options={{
          title: data?.name ?? '',
          headerRight: data ? () => <Actions routine={data} tankId={tankId} /> : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            colors={[colors.lagon]}
            onRefresh={() => void routine.refetch()}
            refreshing={routine.isRefetching}
            tintColor={colors.lagon}
          />
        )}
      >
        {routine.isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
        {routine.isError ? (
          <Surface>
            <AppText tone="ambre">{t('routines.detail.error')}</AppText>
            <Button label={t('common.retry')} onPress={() => void routine.refetch()} variant="soft" />
          </Surface>
        ) : null}
        {data === null ? (
          <Surface>
            <AppText>{t('routines.detail.notFound')}</AppText>
          </Surface>
        ) : null}
        {data ? <Detail routine={data} tankId={tankId} /> : null}
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

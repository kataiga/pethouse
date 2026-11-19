import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { useSession } from '@/features/auth/hooks/session-context';
import { useCurrentHousehold } from '@/features/households/hooks/use-households';
import { PushBanner } from '@/features/notifications/components/push-banner';
import { useActOnOccurrence } from '@/features/routines/hooks/use-occurrences';
import { formatDayHeading } from '@/lib/i18n/format';
import {
  space, useTheme,
} from '@/theme';
import { useToday } from '../hooks/use-today';
import {
  groupOccurrences, type HouseholdOccurrence,
} from '../today-groups';
import { TodayRow } from './today-row';

interface SectionProps {
  title: string;
  tone: 'ambre' | 'soft';
  occurrences: HouseholdOccurrence[];
  timeZone: string;
  overdue: boolean;
  busy: boolean;
  onAct: (occurrence: HouseholdOccurrence, action: 'complete' | 'skip') => void;
  testID: string;
}

function Section ({
  title, tone, occurrences, timeZone, overdue, busy, onAct, testID,
}: SectionProps): React.JSX.Element {
  return (
    <Surface testID={testID}>
      <AppText accessibilityRole="header" tone={tone} variant="label">{title}</AppText>
      {occurrences.map((occurrence) => (
        <TodayRow
          busy={busy}
          key={occurrence.id}
          occurrence={occurrence}
          onAct={(action) => onAct(occurrence, action)}
          overdue={overdue}
          timeZone={timeZone}
        />
      ))}
    </Surface>
  );
}

function Tasks ({ householdId, timeZone }: { householdId: number;
  timeZone: string }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const today = useToday(householdId);
  const act = useActOnOccurrence();

  if (today.isPending) {
    return <ActivityIndicator color={colors.lagon} size="large" />;
  }

  if (today.isError) {
    return (
      <Surface>
        <AppText tone="ambre">{t('today.error')}</AppText>
        <Button label={t('common.retry')} onPress={() => void today.refetch()} variant="soft" />
      </Surface>
    );
  }

  const groups = groupOccurrences(today.data, new Date(), timeZone);
  const sectionProps = {
    timeZone,
    busy: act.isPending,
    onAct: (occurrence: HouseholdOccurrence, action: 'complete' | 'skip') => act.mutate({
      occurrenceId: occurrence.id,
      tankId: occurrence.tank.id,
      action,
    }),
  };
  const nothing = groups.overdue.length === 0 && groups.today.length === 0 && groups.upcoming.length === 0;

  return (
    <>
      {act.error ? (
        <AppText tone="ambre">{act.error.failure === 'conflict' ? t('today.conflict') : t('today.failed')}</AppText>
      ) : null}
      {nothing ? (
        <Surface testID="today-empty">
          <AppText>{t('today.empty')}</AppText>
        </Surface>
      ) : null}
      {groups.overdue.length > 0 ? (
        <Section
          occurrences={groups.overdue}
          overdue
          testID="today-overdue"
          {...sectionProps}
          title={t('today.overdue')}
          tone="ambre"
        />
      ) : null}
      {!nothing && groups.today.length === 0 ? (
        <AppText testID="today-nothing-else" tone="soft">{t('today.nothingElseToday')}</AppText>
      ) : null}
      {groups.today.length > 0 ? (
        <Section
          occurrences={groups.today}
          overdue={false}
          testID="today-today"
          {...sectionProps}
          title={t('today.today')}
          tone="soft"
        />
      ) : null}
      {groups.upcoming.length > 0 ? (
        <AppText accessibilityRole="header" tone="lagon" variant="label">{t('today.upcoming')}</AppText>
      ) : null}
      {groups.upcoming.map((group) => (
        <Section
          key={group.day}
          occurrences={group.occurrences}
          overdue={false}
          testID={`today-day-${group.day}`}
          {...sectionProps}
          title={formatDayHeading(group.day, i18n.language)}
          tone="soft"
        />
      ))}
    </>
  );
}

/** What the household has to do: overdue first, then the rest of today, then the coming days. */
export function TodayScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const state = useSession();
  const name = state.status === 'signedIn' ? state.user.displayName : '';
  const current = useCurrentHousehold();
  const household = current.household;
  const today = useToday(household?.id ?? null);

  return (
    <Screen testID="today-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            colors={[colors.lagon]}
            onRefresh={() => void today.refetch()}
            refreshing={today.isRefetching}
            tintColor={colors.lagon}
          />
        )}
      >
        <View style={styles.header}>
          <AppText tone="lagon" variant="label">{t('today.eyebrow')}</AppText>
          <AppText accessibilityRole="header" variant="display">{t('home.greeting', { name })}</AppText>
        </View>
        <PushBanner />
        {current.isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
        {current.isError ? (
          <Surface>
            <AppText tone="ambre">{t('household.error')}</AppText>
            <Button label={t('common.retry')} onPress={current.refetch} variant="soft" />
          </Surface>
        ) : null}
        {!current.isPending && !current.isError && !household ? (
          <Surface>
            <AppText>{t('today.noHousehold')}</AppText>
          </Surface>
        ) : null}
        {household ? <Tasks householdId={household.id} timeZone={household.timezone} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space.lg,
    paddingBottom: space.xxl,
  },
  header: { gap: space.sm },
});

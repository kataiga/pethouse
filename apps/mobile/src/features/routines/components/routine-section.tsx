import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Surface } from '@/components/ui/surface';
import { formatInZone } from '@/lib/i18n/format';
import {
  space, useTheme,
} from '@/theme';
import {
  type Routine, useRoutines,
} from '../hooks/use-routines';
import { ruleText } from '../rule-text';

function RoutineRow ({ tankId, routine }: { tankId: number;
  routine: Routine }): React.JSX.Element {
  const { t, i18n } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/tanks/${tankId}/routines/${routine.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={`routine-${routine.id}`}
    >
      <View style={styles.title}>
        <AppText style={styles.name} variant="heading">{routine.name}</AppText>
        {!routine.isActive ? <Pill label={t('routines.section.paused')} tone="info" /> : null}
      </View>
      <AppText tone="soft">{ruleText(routine.rrule, routine.dtstart, t, i18n.language)}</AppText>
      {routine.isActive ? (
        <AppText tone="lagon" variant="caption">
          {routine.nextOccurrenceAt === null
            ? t('routines.section.none')
            : t('routines.section.next', {
              date: formatInZone(routine.nextOccurrenceAt, routine.timezone, i18n.language),
            })}
        </AppText>
      ) : null}
    </Pressable>
  );
}

/** A tank's routines with their next occurrence, and the way to add one. */
export function RoutineSection ({ tankId }: { tankId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const routines = useRoutines(tankId);

  return (
    <Surface testID="routine-section">
      <View style={styles.header}>
        <AppText accessibilityRole="header" tone="soft" variant="label">{t('routines.section.title')}</AppText>
        <Pressable
          accessibilityRole="link"
          hitSlop={space.sm}
          onPress={() => router.push(`/tanks/${tankId}/routines/history`)}
          testID="routines-history"
        >
          <AppText tone="lagon" variant="strong">{t('routines.section.history')}</AppText>
        </Pressable>
      </View>
      {routines.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
      {routines.isError ? (
        <>
          <AppText tone="ambre">{t('routines.section.error')}</AppText>
          <Button label={t('common.retry')} onPress={() => void routines.refetch()} variant="soft" />
        </>
      ) : null}
      {routines.data?.length === 0 ? <AppText tone="soft">{t('routines.section.empty')}</AppText> : null}
      {routines.data?.map((routine) => <RoutineRow key={routine.id} routine={routine} tankId={tankId} />)}
      <Button
        label={t('routines.section.add')}
        onPress={() => router.push(`/tanks/${tankId}/routines/new`)}
        testID="routines-add"
        variant="soft"
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    gap: space.xs,
    paddingVertical: space.sm,
  },
  pressed: { opacity: 0.8 },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  name: { flex: 1 },
});

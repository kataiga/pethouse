import { useTranslation } from 'react-i18next';
import {
  StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import {
  Pill, type PillTone,
} from '@/components/ui/pill';
import { formatInstantDateTime } from '@/lib/i18n/format';
import { space } from '@/theme';
import type { Occurrence } from '../hooks/use-occurrences';

const TONES: Record<Occurrence['status'], PillTone> = {
  PENDING: 'info',
  DONE: 'done',
  SKIPPED: 'info',
  MISSED: 'late',
};

/** Who did what, when: done or skipped by someone, or missed. */
export function HistoryRow ({ occurrence, showRoutine }: { occurrence: Occurrence;
  showRoutine: boolean }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const status = t(`routines.history.statuses.${occurrence.status}`);
  const line = occurrence.completedBy !== null && occurrence.completedAt !== null
    ? t('routines.history.by', {
      status,
      name: occurrence.completedBy.displayName,
      date: formatInstantDateTime(occurrence.completedAt, i18n.language),
    })
    : t('routines.history.missed', { date: formatInstantDateTime(occurrence.scheduledFor, i18n.language) });

  return (
    <View style={styles.row} testID={`history-${occurrence.id}`}>
      <View style={styles.text}>
        {showRoutine ? <AppText variant="heading">{occurrence.routine.name}</AppText> : null}
        <AppText tone="soft">{line}</AppText>
      </View>
      <Pill label={status} tone={TONES[occurrence.status]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
  },
  text: {
    flex: 1,
    gap: space.xs,
  },
});

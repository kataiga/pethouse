import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import {
  formatInZone, formatTimeInZone,
} from '@/lib/i18n/format';
import { space } from '@/theme';
import type { HouseholdOccurrence } from '../today-groups';

export interface TodayRowProps {
  occurrence: HouseholdOccurrence;
  timeZone: string;
  overdue: boolean;
  busy: boolean;
  onAct: (action: 'complete' | 'skip') => void;
}

/** A task to do: which routine, on which tank, when; tap it for the routine, or close it here. */
export function TodayRow ({
  occurrence, timeZone, overdue, busy, onAct,
}: TodayRowProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  // An overdue task may be from another day: say which.
  const when = overdue
    ? formatInZone(occurrence.scheduledFor, timeZone, i18n.language)
    : formatTimeInZone(occurrence.scheduledFor, timeZone, i18n.language);

  return (
    <View style={styles.row} testID={`today-${occurrence.id}`}>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push(`/tanks/${occurrence.tank.id}/routines/${occurrence.routine.id}`)}
        style={styles.text}
        testID={`today-${occurrence.id}-open`}
      >
        <AppText variant="heading">{occurrence.routine.name}</AppText>
        <AppText tone={overdue ? 'ambre' : 'soft'}>
          {t('today.where', {
            time: when,
            tank: occurrence.tank.name,
          })}
        </AppText>
      </Pressable>
      <View style={styles.actions}>
        <Button
          disabled={busy}
          label={t('today.done')}
          onPress={() => onAct('complete')}
          testID={`today-${occurrence.id}-done`}
        />
        <Button
          disabled={busy}
          label={t('today.skip')}
          onPress={() => onAct('skip')}
          testID={`today-${occurrence.id}-skip`}
          variant="soft"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space.sm,
    paddingVertical: space.sm,
  },
  text: { gap: space.xs },
  actions: {
    flexDirection: 'row',
    gap: space.sm,
  },
});

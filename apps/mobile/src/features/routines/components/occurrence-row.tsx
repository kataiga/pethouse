import { useTranslation } from 'react-i18next';
import {
  StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { formatInZone } from '@/lib/i18n/format';
import { space } from '@/theme';
import type { Occurrence } from '../hooks/use-occurrences';

export interface OccurrenceRowProps {
  occurrence: Occurrence;
  timezone: string;
  overdue: boolean;
  busy: boolean;
  onAct: (action: 'complete' | 'skip') => void;
}

/** One due task: when, and the two ways to close it. */
export function OccurrenceRow ({
  occurrence, timezone, overdue, busy, onAct,
}: OccurrenceRowProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.row} testID={`occurrence-${occurrence.id}`}>
      <View style={styles.text}>
        <AppText tone={overdue ? 'ambre' : 'default'} variant="strong">
          {formatInZone(occurrence.scheduledFor, timezone, i18n.language)}
        </AppText>
        {overdue ? <AppText tone="ambre" variant="caption">{t('routines.detail.overdue')}</AppText> : null}
      </View>
      <Button
        disabled={busy}
        label={t('routines.detail.done')}
        onPress={() => onAct('complete')}
        testID={`occurrence-${occurrence.id}-done`}
      />
      <Button
        disabled={busy}
        label={t('routines.detail.skip')}
        onPress={() => onAct('skip')}
        testID={`occurrence-${occurrence.id}-skip`}
        variant="soft"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
  },
  text: {
    flex: 1,
    gap: space.xs,
  },
});

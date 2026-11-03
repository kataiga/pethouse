import {
  useEffect, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { formatInZone } from '@/lib/i18n/format';
import {
  space, useTheme,
} from '@/theme';
import { usePreview } from '../hooks/use-preview';
import type { Schedule } from '../routine-form';

const PREVIEW_DELAY_MS = 400;

/**
 * The schedule once the person stopped changing it for a moment: one request, not one per tap.
 * It settles on a text key, so a new object holding the same rule is no change.
 */
function useSettled (schedule: Schedule | null): Schedule | null {
  const key = schedule === null ? null : `${schedule.rrule}|${schedule.dtstart}`;
  const [settled, setSettled] = useState(key);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(key), PREVIEW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [key]);

  if (settled === null) {
    return null;
  }

  const [rrule = '', dtstart = ''] = settled.split('|');

  return {
    rrule,
    dtstart,
  };
}

/** The next occurrences of the draft rule, worked out by the API in the household's zone. */
export function PreviewList ({ tankId, schedule }: { tankId: number;
  schedule: Schedule | null }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const preview = usePreview(tankId, useSettled(schedule));

  return (
    <View style={{ gap: space.sm }} testID="preview">
      <AppText tone="soft" variant="label">{t('routines.preview.title')}</AppText>
      {preview.isFetching && !preview.data ? <ActivityIndicator color={colors.lagon} /> : null}
      {preview.isError ? <AppText tone="ambre">{t('routines.preview.error')}</AppText> : null}
      {preview.data && preview.data.occurrences.length === 0 ? (
        <AppText tone="ambre">{t('routines.preview.none')}</AppText>
      ) : null}
      {preview.data?.occurrences.map((instant) => (
        <AppText key={instant}>{formatInZone(instant, preview.data.timezone, i18n.language)}</AppText>
      ))}
      {preview.data ? (
        <AppText tone="soft" variant="caption">
          {t('routines.preview.timezone', { zone: preview.data.timezone })}
        </AppText>
      ) : null}
    </View>
  );
}

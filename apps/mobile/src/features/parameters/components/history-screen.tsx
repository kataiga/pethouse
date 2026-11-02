import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Surface } from '@/components/ui/surface';
import {
  space, useTheme,
} from '@/theme';
import {
  HISTORY_PERIODS, type HistoryPeriod,
} from '../history-range';
import {
  useDeleteReading, useHistory, useMeasurements, useUpdateReading,
} from '../hooks/use-measurements';
import {
  type ResolvedParameter, useTankParameters,
} from '../hooks/use-tank-parameters';
import { definitionLabel } from '../labels';
import { rangeText } from '../range-text';
import { HistoryChart } from './history-chart';
import { ReadingRow } from './reading-row';

function Readings ({ tankId, parameter }: { tankId: number;
  parameter: ResolvedParameter }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const readings = useMeasurements(tankId, parameter.definition.id);
  const correct = useUpdateReading(tankId);
  const remove = useDeleteReading(tankId);
  const rows = readings.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Surface testID="readings">
      <AppText accessibilityRole="header" tone="soft" variant="label">{t('parameters.history.readings')}</AppText>
      {readings.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
      {readings.isError ? (
        <>
          <AppText tone="ambre">{t('parameters.history.error')}</AppText>
          <Button label={t('common.retry')} onPress={() => void readings.refetch()} variant="soft" />
        </>
      ) : null}
      {correct.isError || remove.isError ? <AppText tone="ambre">{t('parameters.errors.failed')}</AppText> : null}
      {readings.data && rows.length === 0 ? <AppText tone="soft">{t('parameters.history.noReadings')}</AppText> : null}
      {rows.map((measurement) => (
        <ReadingRow
          busy={correct.isPending || remove.isPending}
          key={`${measurement.id}-${measurement.value}`}
          max={parameter.maxThreshold}
          measurement={measurement}
          min={parameter.minThreshold}
          onCorrect={(value) => correct.mutate({
            measurementId: measurement.id,
            change: { value },
          })}
          onDelete={() => remove.mutate(measurement.id)}
        />
      ))}
      {readings.hasNextPage ? (
        <Button
          label={t('parameters.history.more')}
          loading={readings.isFetchingNextPage}
          onPress={() => void readings.fetchNextPage()}
          testID="readings-more"
          variant="soft"
        />
      ) : null}
    </Surface>
  );
}

function ParameterHistory ({ tankId, parameter }: { tankId: number;
  parameter: ResolvedParameter }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [period, setPeriod] = useState<HistoryPeriod>('month');
  const history = useHistory(tankId, parameter.definition.id, period);
  const name = definitionLabel(parameter.definition, t);

  return (
    <>
      <Stack.Screen options={{ title: name }} />
      <AppText tone="soft">
        {rangeText(parameter.minThreshold, parameter.maxThreshold, parameter.definition, t, i18n.language)}
      </AppText>
      {!parameter.enabled ? <AppText tone="soft">{t('parameters.history.disabled')}</AppText> : null}
      <SegmentedControl<HistoryPeriod>
        label={t('parameters.history.period')}
        onChange={setPeriod}
        options={HISTORY_PERIODS.map((value) => ({
          value,
          label: t(`parameters.history.periods.${value}`),
        }))}
        testID="history-period"
        value={period}
      />
      <Surface>
        {history.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
        {history.isError ? (
          <>
            <AppText tone="ambre">{t('parameters.history.error')}</AppText>
            <Button label={t('common.retry')} onPress={() => void history.refetch()} variant="soft" />
          </>
        ) : null}
        {history.data && history.data.points.length === 0 ? (
          <AppText tone="soft">{t('parameters.history.empty')}</AppText>
        ) : null}
        {history.data && history.data.points.length > 0 ? (
          <HistoryChart history={history.data} label={t('parameters.history.chartLabel', { name })} />
        ) : null}
      </Surface>
      <Readings parameter={parameter} tankId={tankId} />
    </>
  );
}

/** One parameter of one tank over time: the chart with its band, then every reading. */
export function HistoryScreen ({ tankId, definitionId }: { tankId: number;
  definitionId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const parameters = useTankParameters(tankId);
  const parameter = parameters.data?.find((candidate) => candidate.definition.id === definitionId);

  return (
    <Screen testID="history-screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {parameters.isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
          {parameters.isError ? (
            <Surface>
              <AppText tone="ambre">{t('parameters.tank.error')}</AppText>
              <Button label={t('common.retry')} onPress={() => void parameters.refetch()} variant="soft" />
            </Surface>
          ) : null}
          {parameters.data && !parameter ? (
            <Surface>
              <AppText>{t('tanks.detail.notFound')}</AppText>
            </Surface>
          ) : null}
          {parameter ? <ParameterHistory parameter={parameter} tankId={tankId} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    gap: space.lg,
    paddingBottom: space.xxl,
  },
});

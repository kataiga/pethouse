import {
  router, Stack,
} from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import {
  space, useTheme,
} from '@/theme';
import {
  type NewReading, PartialBatchError, useRecordReadings,
} from '../hooks/use-measurements';
import {
  type ResolvedParameter, useTankParameters,
} from '../hooks/use-tank-parameters';
import { definitionLabel } from '../labels';
import {
  formatValue, isOutOfRange, parseReading, withUnit,
} from '../range';
import { DateTimeField } from './date-time-field';

function ReadingField ({ parameter, text, onChange }: { parameter: ResolvedParameter;
  text: string;
  onChange: (text: string) => void }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { definition, latest } = parameter;
  const parsed = parseReading(text, definition.decimals);
  const name = definitionLabel(definition, t);
  const outOfRange = 'value' in parsed && parsed.value !== null
    && isOutOfRange(parsed.value, parameter.minThreshold, parameter.maxThreshold);

  return (
    <View style={styles.field}>
      <TextField
        error={'error' in parsed ? t(`parameters.errors.${parsed.error}`) : undefined}
        inputMode="decimal"
        keyboardType="numbers-and-punctuation"
        label={definition.unit === '' ? name : `${name} (${definition.unit})`}
        onChangeText={onChange}
        placeholder={latest
          ? t('parameters.measure.last', {
            value: withUnit(formatValue(latest.value, definition.decimals, i18n.language), definition.unit),
          })
          : undefined}
        testID={`measure-${definition.slug}`}
        value={text}
      />
      {outOfRange ? <Pill label={t('parameters.tank.outOfRange')} tone="late" /> : null}
    </View>
  );
}

function MeasureForm ({ tankId, tracked }: { tankId: number;
  tracked: ResolvedParameter[] }): React.JSX.Element {
  const { t } = useTranslation();
  const record = useRecordReadings(tankId);
  const [texts, setTexts] = useState<ReadonlyMap<number, string>>(new Map());
  const [measuredAt, setMeasuredAt] = useState(() => new Date());
  const [note, setNote] = useState('');
  const [nothing, setNothing] = useState(false);
  const [partial, setPartial] = useState<{ recorded: number;
    total: number } | null>(null);

  const parsed = tracked.map((parameter) => ({
    parameter,
    reading: parseReading(texts.get(parameter.definition.id) ?? '', parameter.definition.decimals),
  }));
  const invalid = parsed.some(({ reading }) => 'error' in reading);

  const submit = (): void => {
    const readings: NewReading[] = [];

    for (const { parameter, reading } of parsed) {
      if ('value' in reading && reading.value !== null) {
        readings.push({
          parameterDefinitionId: parameter.definition.id,
          value: reading.value,
        });
      }
    }

    setNothing(readings.length === 0);
    if (readings.length === 0 || invalid) {
      return;
    }
    setPartial(null);
    record.mutate({
      readings,
      measuredAt: measuredAt.toISOString(),
      note: note.trim() === '' ? null : note.trim(),
    }, {
      onSuccess: () => router.back(),
      onError: (error) => {
        if (error instanceof PartialBatchError) {
          // What went through is kept; only the rest stays in the form for another try.
          const left = new Map(texts);
          error.recorded.forEach((id) => left.delete(id));
          setTexts(left);
          setPartial({
            recorded: error.recorded.length,
            total: readings.length,
          });
        }
      },
    });
  };

  return (
    <>
      <AppText tone="soft">{t('parameters.measure.explain')}</AppText>
      <DateTimeField onChange={setMeasuredAt} testID="measure-at" value={measuredAt} />
      {tracked.map((parameter) => (
        <ReadingField
          key={parameter.definition.id}
          onChange={(text) => {
            setNothing(false);
            setTexts(new Map(texts).set(parameter.definition.id, text));
          }}
          parameter={parameter}
          text={texts.get(parameter.definition.id) ?? ''}
        />
      ))}
      <TextField
        label={t('parameters.measure.note')}
        maxLength={500}
        multiline
        onChangeText={setNote}
        placeholder={t('parameters.measure.notePlaceholder')}
        testID="measure-note"
        value={note}
      />
      {nothing ? <AppText tone="ambre">{t('parameters.measure.nothing')}</AppText> : null}
      {partial ? <AppText tone="ambre">{t('parameters.measure.partial', partial)}</AppText> : null}
      {record.isError && !partial ? <AppText tone="ambre">{t('parameters.errors.failed')}</AppText> : null}
      <Button
        disabled={invalid}
        label={t('parameters.measure.submit')}
        loading={record.isPending}
        onPress={submit}
        testID="measure-submit"
      />
    </>
  );
}

/** One test session: every tracked parameter at once, only the measured ones filled in. */
export function MeasureScreen ({ tankId }: { tankId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const parameters = useTankParameters(tankId);
  const tracked = parameters.data?.filter((parameter) => parameter.enabled) ?? [];

  return (
    <Screen testID="measure-screen">
      <Stack.Screen options={{ title: t('parameters.measure.title') }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {parameters.isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
          {parameters.isError ? (
            <Surface>
              <AppText tone="ambre">{t('parameters.tank.error')}</AppText>
              <Button label={t('common.retry')} onPress={() => void parameters.refetch()} variant="soft" />
            </Surface>
          ) : null}
          {parameters.data && tracked.length === 0 ? (
            <Surface>
              <AppText>{t('parameters.measure.none')}</AppText>
            </Surface>
          ) : null}
          {tracked.length > 0 ? <MeasureForm tankId={tankId} tracked={tracked} /> : null}
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
  field: { gap: space.xs },
});

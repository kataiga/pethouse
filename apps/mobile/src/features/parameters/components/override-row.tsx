import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import type {
  OverrideInput, ResolvedParameter,
} from '../hooks/use-tank-parameters';
import { definitionLabel } from '../labels';
import {
  parseThresholds, type ThresholdError,
} from '../range';
import { rangeText } from '../range-text';
import { thresholdText } from '../settings-form';
import { space } from '@/theme';
import { ThresholdFields } from './threshold-fields';
import { Toggle } from './toggle';

export interface OverrideRowProps {
  parameter: ResolvedParameter;
  busy: boolean;
  /** The tank's whole deviation for this parameter: the API replaces it, never merges. */
  onOverride: (input: OverrideInput) => void;
  onInherit: () => void;
}

/** One parameter on one tank: follow the account, or deviate on tracking or thresholds. */
export function OverrideRow ({
  parameter, busy, onOverride, onInherit,
}: OverrideRowProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { definition, account, override } = parameter;
  const decimals = definition.decimals;
  const [min, setMin] = useState(() => thresholdText(override?.minThreshold ?? null, decimals, i18n.language));
  const [max, setMax] = useState(() => thresholdText(override?.maxThreshold ?? null, decimals, i18n.language));
  const [errors, setErrors] = useState<{ min?: ThresholdError;
    max?: ThresholdError }>({});
  const testID = `override-${definition.slug}`;
  const storedMin = thresholdText(override?.minThreshold ?? null, decimals, i18n.language);
  const storedMax = thresholdText(override?.maxThreshold ?? null, decimals, i18n.language);
  const thresholdsChanged = min !== storedMin || max !== storedMax;
  const name = definitionLabel(definition, t);
  const sourceLabel = parameter.overridden
    ? t('parameters.manage.fromTank')
    : t(parameter.source === 'default' ? 'parameters.manage.fromDefault' : 'parameters.manage.fromAccount');

  const toggle = (enabled: boolean): void => {
    onOverride({
      // Back to the account's own value is no deviation at all.
      enabled: enabled === account.enabled ? null : enabled,
      minThreshold: override?.minThreshold ?? null,
      maxThreshold: override?.maxThreshold ?? null,
    });
  };

  const saveThresholds = (): void => {
    const parsed = parseThresholds(min, max, decimals);

    if (!parsed.ok) {
      setErrors({
        ...(parsed.minError ? { min: parsed.minError } : {}),
        ...(parsed.maxError ? { max: parsed.maxError } : {}),
      });

      return;
    }
    setErrors({});
    onOverride({
      enabled: override?.enabled ?? null,
      minThreshold: parsed.value.min,
      maxThreshold: parsed.value.max,
    });
  };

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.header}>
        <AppText style={styles.name} variant="heading">
          {definition.unit === '' ? name : `${name} (${definition.unit})`}
        </AppText>
        <Pill label={sourceLabel} tone={parameter.overridden ? 'info' : 'done'} />
      </View>
      <Toggle
        disabled={busy}
        label={t('parameters.manage.tracked')}
        onChange={toggle}
        testID={`${testID}-enabled`}
        value={parameter.enabled}
      />
      {parameter.enabled ? (
        <>
          <ThresholdFields
            max={max}
            maxError={errors.max}
            min={min}
            minError={errors.min}
            onChange={(nextMin, nextMax) => {
              setMin(nextMin);
              setMax(nextMax);
            }}
            placeholder={{
              min: thresholdText(account.minThreshold, decimals, i18n.language),
              max: thresholdText(account.maxThreshold, decimals, i18n.language),
            }}
            testID={testID}
          />
          <AppText tone="soft" variant="caption">
            {t('parameters.manage.thresholdsHint', {
              range: rangeText(account.minThreshold, account.maxThreshold, definition, t, i18n.language),
            })}
          </AppText>
          {thresholdsChanged ? (
            <Button
              disabled={busy}
              label={t('parameters.manage.save')}
              onPress={saveThresholds}
              testID={`${testID}-save`}
              variant="soft"
            />
          ) : null}
        </>
      ) : null}
      {parameter.overridden ? (
        <Button
          disabled={busy}
          label={t('parameters.manage.reset')}
          onPress={onInherit}
          testID={`${testID}-reset`}
          variant="soft"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space.sm,
    paddingVertical: space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  name: { flex: 1 },
});

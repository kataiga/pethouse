import { useTranslation } from 'react-i18next';
import {
  Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Pill } from '@/components/ui/pill';
import { space } from '@/theme';
import type { Setting } from '../hooks/use-settings';
import { definitionLabel } from '../labels';
import type { ThresholdError } from '../range';
import type { SettingDraft } from '../settings-form';
import { ThresholdFields } from './threshold-fields';
import { Toggle } from './toggle';

export interface SettingRowProps {
  setting: Setting;
  draft: SettingDraft;
  onChange: (draft: SettingDraft) => void;
  errors: { min?: ThresholdError;
    max?: ThresholdError };
  /** Offered for the household's own parameters only. */
  onDelete?: () => void;
}

/** One parameter of the account settings: tracked or not, and its acceptable range. */
export function SettingRow ({
  setting, draft, onChange, errors, onDelete,
}: SettingRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const { definition } = setting;
  const name = definitionLabel(definition, t);
  const testID = `setting-${definition.slug}`;

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.header}>
        <View style={styles.title}>
          <AppText variant="heading">{definition.unit === '' ? name : `${name} (${definition.unit})`}</AppText>
          <Pill
            label={definition.isSystem
              ? t(setting.customised ? 'parameters.account.customised' : 'parameters.account.default')
              : t('parameters.account.household')}
            tone={setting.customised || !definition.isSystem ? 'info' : 'done'}
          />
        </View>
        {onDelete ? (
          <Pressable accessibilityRole="button" hitSlop={space.sm} onPress={onDelete} testID={`${testID}-delete`}>
            <AppText tone="ambre" variant="strong">{t('parameters.custom.delete')}</AppText>
          </Pressable>
        ) : null}
      </View>
      <Toggle
        label={t('parameters.account.tracked')}
        onChange={(enabled) => onChange({
          ...draft,
          enabled,
        })}
        testID={`${testID}-enabled`}
        value={draft.enabled}
      />
      {draft.enabled ? (
        <ThresholdFields
          max={draft.max}
          maxError={errors.max}
          min={draft.min}
          minError={errors.min}
          onChange={(min, max) => onChange({
            ...draft,
            min,
            max,
          })}
          testID={testID}
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
    alignItems: 'flex-start',
    gap: space.md,
  },
  title: {
    flex: 1,
    gap: space.xs,
  },
});

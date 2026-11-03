import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { TextField } from '@/components/ui/text-field';
import { space } from '@/theme';
import {
  formatDecimal, suggestedVolume, TANK_LIMITS, type TankFormErrors, type TankFormValues,
} from '../tank-form';
import { DateField } from '@/components/ui/date-field';

export interface TankDetailsFormProps {
  values: TankFormValues;
  errors: TankFormErrors;
  onChange: (values: TankFormValues) => void;
}

type Dimension = 'widthCm' | 'depthCm' | 'heightCm';

const DIMENSIONS: readonly { field: Dimension;
  label: 'tanks.form.width' | 'tanks.form.depth' | 'tanks.form.height' }[] = [
  {
    field: 'widthCm',
    label: 'tanks.form.width',
  },
  {
    field: 'depthCm',
    label: 'tanks.form.depth',
  },
  {
    field: 'heightCm',
    label: 'tanks.form.height',
  },
];

/**
 * Name, dimensions, volume, substrate, start date and notes. The volume follows the dimensions
 * until the person types one of their own.
 */
export function TankDetailsForm ({ values, errors, onChange }: TankDetailsFormProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [volumeFromDimensions, setVolumeFromDimensions] = useState(values.volumeLiters === '');
  const errorText = (field: keyof TankFormValues): string | undefined => {
    const error = errors[field];

    return error === undefined ? undefined : t(`tanks.form.errors.${error}`);
  };

  const setDimension = (field: Dimension, text: string): void => {
    const next = {
      ...values,
      [field]: text,
    };

    if (volumeFromDimensions) {
      const volume = suggestedVolume(next.widthCm, next.heightCm, next.depthCm);
      next.volumeLiters = volume === null ? '' : formatDecimal(volume, i18n.language);
    }
    onChange(next);
  };

  return (
    <View style={styles.form}>
      <TextField
        error={errorText('name')}
        label={t('tanks.form.name')}
        maxLength={TANK_LIMITS.name}
        onChangeText={(name) => onChange({
          ...values,
          name,
        })}
        placeholder={t('tanks.form.namePlaceholder')}
        testID="tank-name"
        value={values.name}
      />
      <View style={styles.row}>
        {DIMENSIONS.map(({ field, label }) => (
          <View key={field} style={styles.cell}>
            <TextField
              error={errorText(field)}
              inputMode="decimal"
              keyboardType="decimal-pad"
              label={t(label)}
              onChangeText={(text) => setDimension(field, text)}
              testID={`tank-${field}`}
              value={values[field]}
            />
          </View>
        ))}
      </View>
      <TextField
        error={errorText('volumeLiters')}
        inputMode="decimal"
        keyboardType="decimal-pad"
        label={t('tanks.form.volume')}
        onChangeText={(volumeLiters) => {
          setVolumeFromDimensions(volumeLiters === '');
          onChange({
            ...values,
            volumeLiters,
          });
        }}
        testID="tank-volume"
        value={values.volumeLiters}
      />
      {volumeFromDimensions && values.volumeLiters !== '' ? (
        <AppText testID="tank-volume-suggested" tone="soft" variant="caption">
          {t('tanks.form.volumeSuggested')}
        </AppText>
      ) : null}
      <TextField
        error={errorText('substrate')}
        label={t('tanks.form.substrate')}
        maxLength={TANK_LIMITS.substrate}
        onChangeText={(substrate) => onChange({
          ...values,
          substrate,
        })}
        placeholder={t('tanks.form.substratePlaceholder')}
        testID="tank-substrate"
        value={values.substrate}
      />
      <DateField
        label={t('tanks.form.startedAt')}
        clearLabel={t('tanks.form.startedAtClear')}
        maximumDate={new Date()}
        onChange={(startedAt) => onChange({
          ...values,
          startedAt,
        })}
        placeholder={t('tanks.form.startedAtPick')}
        testID="tank-started-at"
        value={values.startedAt}
      />
      <TextField
        error={errorText('description')}
        label={t('tanks.form.description')}
        maxLength={TANK_LIMITS.description}
        multiline
        onChangeText={(description) => onChange({
          ...values,
          description,
        })}
        testID="tank-description"
        value={values.description}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  row: {
    flexDirection: 'row',
    gap: space.sm,
  },
  cell: { flex: 1 },
});

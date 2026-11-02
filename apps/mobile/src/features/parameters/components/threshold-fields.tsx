import { useTranslation } from 'react-i18next';
import {
  StyleSheet, View,
} from 'react-native';
import { TextField } from '@/components/ui/text-field';
import { space } from '@/theme';
import type { ThresholdError } from '../range';

export interface ThresholdFieldsProps {
  min: string;
  max: string;
  onChange: (min: string, max: string) => void;
  minError?: ThresholdError;
  maxError?: ThresholdError;
  /** Shown when a field is empty: what an empty bound falls back to. */
  placeholder?: { min: string;
    max: string };
  testID: string;
}

/** The acceptable range of one parameter, both bounds optional. */
export function ThresholdFields ({
  min, max, onChange, minError, maxError, placeholder, testID,
}: ThresholdFieldsProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <View style={styles.cell}>
        <TextField
          error={minError ? t(`parameters.errors.${minError}`) : undefined}
          inputMode="decimal"
          keyboardType="numbers-and-punctuation"
          label={t('parameters.account.min')}
          onChangeText={(text) => onChange(text, max)}
          placeholder={placeholder?.min}
          testID={`${testID}-min`}
          value={min}
        />
      </View>
      <View style={styles.cell}>
        <TextField
          error={maxError ? t(`parameters.errors.${maxError}`) : undefined}
          inputMode="decimal"
          keyboardType="numbers-and-punctuation"
          label={t('parameters.account.max')}
          onChangeText={(text) => onChange(min, text)}
          placeholder={placeholder?.max}
          testID={`${testID}-max`}
          value={max}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.sm,
  },
  cell: { flex: 1 },
});

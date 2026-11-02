import {
  StyleSheet, TextInput, type TextInputProps, View,
} from 'react-native';
import {
  fonts, radius, space, typeScale, useTheme,
} from '@/theme';
import { AppText } from './app-text';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label: string;
  /** Already translated; shown under the field and announced with it. */
  error?: string;
}

export function TextField ({
  label, error, testID, ...input
}: TextFieldProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <AppText tone="soft" variant="label">{label}</AppText>
      <TextInput
        accessibilityHint={error}
        accessibilityLabel={label}
        placeholderTextColor={colors.inkSoft}
        selectionColor={colors.lagon}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            color: colors.ink,
            borderColor: error ? colors.ambre : colors.line,
          },
        ]}
        testID={testID}
        {...input}
      />
      {error ? <AppText tone="ambre" variant="caption">{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  input: {
    ...typeScale.body,
    fontFamily: fonts.regular,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
  },
});

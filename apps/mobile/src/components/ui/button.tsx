import {
  ActivityIndicator, Pressable, StyleSheet,
} from 'react-native';
import {
  radius, space, useTheme,
} from '@/theme';
import { AppText } from './app-text';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  /** `primary` for the main action of a screen, `soft` for everything else. */
  variant?: 'primary' | 'soft';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

export function Button ({
  label, onPress, variant = 'primary', loading = false, disabled = false, testID,
}: ButtonProps): React.JSX.Element {
  const { colors } = useTheme();
  const primary = variant === 'primary';
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{
        disabled: inactive,
        busy: loading,
      }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? colors.lagon : colors.lagonVeil },
        (pressed || inactive) && styles.dimmed,
      ]}
      testID={testID}
    >
      {loading
        ? <ActivityIndicator color={primary ? colors.onLagon : colors.lagon} />
        : <AppText tone={primary ? 'onLagon' : 'lagon'} variant="heading">{label}</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.6 },
});

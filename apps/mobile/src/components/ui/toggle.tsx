import {
  StyleSheet, Switch, View,
} from 'react-native';
import { AppText } from './app-text';
import {
  space, useTheme,
} from '@/theme';

export interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  testID: string;
}

/** A labelled on/off switch in the theme's colours. */
export function Toggle ({
  label, value, onChange, disabled = false, testID,
}: ToggleProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>
      <AppText style={styles.label}>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onChange}
        testID={testID}
        thumbColor={value ? colors.onLagon : colors.inkSoft}
        trackColor={{
          false: colors.line,
          true: colors.lagon,
        }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  label: { flex: 1 },
});

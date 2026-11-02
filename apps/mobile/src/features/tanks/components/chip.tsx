import {
  Pressable, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import {
  radius, space, useTheme,
} from '@/theme';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

/** One choice among a few, shown inline. */
export function Chip ({
  label, selected, onPress, testID,
}: ChipProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.lagon : colors.surface,
          borderColor: selected ? colors.lagon : colors.line,
        },
      ]}
      testID={testID}
    >
      <AppText tone={selected ? 'onLagon' : 'default'} variant="strong">{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
});

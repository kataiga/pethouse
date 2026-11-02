import {
  Pressable, StyleSheet, View,
} from 'react-native';
import {
  radius, space, useTheme,
} from '@/theme';
import { AppText } from './app-text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

/** One choice among a few, all visible: language, day or night. */
export function SegmentedControl<T extends string> ({
  label, options, value, onChange, testID,
}: SegmentedControlProps<T>): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={styles.group}>
      <AppText tone="soft" variant="label">{label}</AppText>
      <View
        accessibilityLabel={label}
        accessibilityRole="radiogroup"
        style={[styles.track, { backgroundColor: colors.surface }]}
      >
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.segment, selected && { backgroundColor: colors.lagonVeil }]}
              testID={testID === undefined ? undefined : `${testID}-${option.value}`}
            >
              <AppText tone={selected ? 'lagon' : 'soft'} variant="strong">{option.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  track: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: space.xs,
    gap: space.xs,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

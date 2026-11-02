import {
  StyleSheet, View, type ViewProps,
} from 'react-native';
import {
  radius, space, useTheme,
} from '@/theme';

/** A block that stands out from the background by its tint, never by a shadow. */
export function Surface ({ style, ...props }: ViewProps): React.JSX.Element {
  const { colors } = useTheme();

  return <View style={[styles.surface, { backgroundColor: colors.surface }, style]} {...props} />;
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: radius.md,
    padding: space.md,
    gap: space.sm,
  },
});

import {
  StyleSheet, type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  space, useTheme,
} from '@/theme';

/** Full-screen container on the theme background, inside the safe area. */
export function Screen ({ style, ...props }: ViewProps): React.JSX.Element {
  const { colors } = useTheme();

  return <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }, style]} {...props} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    gap: space.lg,
  },
});

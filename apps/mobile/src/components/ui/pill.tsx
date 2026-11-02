import {
  StyleSheet, View,
} from 'react-native';
import {
  type Palette, radius, space, useTheme,
} from '@/theme';
import { AppText } from './app-text';

export type PillTone = 'done' | 'late' | 'info';

const TONES: Record<PillTone, { background: keyof Palette;
  text: 'mousse' | 'ambre' | 'lagon' }> = {
  done: {
    background: 'mousseVeil',
    text: 'mousse',
  },
  late: {
    background: 'ambreVeil',
    text: 'ambre',
  },
  info: {
    background: 'lagonVeil',
    text: 'lagon',
  },
};

/** A state at a glance: done in moss, needs attention in amber, neutral in lagoon. */
export function Pill ({ label, tone }: { label: string;
  tone: PillTone }): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={[styles.pill, { backgroundColor: colors[TONES[tone].background] }]}>
      <AppText tone={TONES[tone].text} variant="strong">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
});

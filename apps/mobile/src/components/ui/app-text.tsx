import {
  StyleSheet, Text, type TextProps,
} from 'react-native';
import {
  type Palette, typeScale, type TypeVariant, useTheme,
} from '@/theme';

export type TextTone = 'default' | 'soft' | 'lagon' | 'mousse' | 'ambre' | 'onLagon';

const TONE_COLOR: Record<TextTone, keyof Palette> = {
  default: 'ink',
  soft: 'inkSoft',
  lagon: 'lagon',
  mousse: 'mousse',
  ambre: 'ambre',
  onLagon: 'onLagon',
};

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: TextTone;
}

/** Every piece of text in the app; it never takes a raw colour or size. */
export function AppText ({
  variant = 'body', tone = 'default', style, ...props
}: AppTextProps): React.JSX.Element {
  const { colors } = useTheme();

  const color = colors[TONE_COLOR[tone]];

  return <Text style={StyleSheet.flatten([typeScale[variant], { color }, style])} {...props} />;
}

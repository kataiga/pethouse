/** Night water by default, day water for whoever prefers a light screen. */
export type ColorScheme = 'dark' | 'light';

export const DEFAULT_SCHEME: ColorScheme = 'dark';

export interface Palette {
  /** Screen background: night water, or sand by day. */
  background: string;
  /** Cards and blocks; they stand out by tint, never by shadow. */
  surface: string;
  ink: string;
  inkSoft: string;
  line: string;
  /** Actions and links. */
  lagon: string;
  lagonVeil: string;
  onLagon: string;
  /** Done, within range. */
  mousse: string;
  mousseVeil: string;
  /** Out of range, late. */
  ambre: string;
  ambreVeil: string;
}

export const palettes: Record<ColorScheme, Palette> = {
  dark: {
    background: '#0B1A1C',
    surface: '#13292B',
    ink: '#E2EDEA',
    inkSoft: '#92ABA6',
    line: '#22393B',
    lagon: '#4FC1B6',
    lagonVeil: '#173F3E',
    onLagon: '#06201F',
    mousse: '#8DBB6E',
    mousseVeil: '#213826',
    ambre: '#E7B04B',
    ambreVeil: '#3A2E15',
  },
  light: {
    background: '#EFEDE6',
    surface: '#FBFAF6',
    ink: '#13302F',
    inkSoft: '#516864',
    line: '#DCDDD3',
    lagon: '#0E6E6B',
    lagonVeil: '#D5E9E5',
    onLagon: '#FFFFFF',
    mousse: '#3D6629',
    mousseVeil: '#E1ECD7',
    ambre: '#8A5600',
    ambreVeil: '#F6E7C8',
  },
};

/** Figtree for everything; on Android each weight is its own family. */
export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  extrabold: 'Figtree_800ExtraBold',
} as const;

export const typeScale = {
  display: {
    fontFamily: fonts.extrabold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: fonts.extrabold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  heading: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
  },
  strong: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 21,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
} as const;

export type TypeVariant = keyof typeof typeScale;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
} as const;

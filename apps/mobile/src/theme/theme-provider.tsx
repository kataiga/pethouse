import {
  createContext, useContext, useMemo, useState,
} from 'react';
import {
  type ColorScheme, DEFAULT_SCHEME, type Palette, palettes,
} from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  setScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<Theme | null>(null);

/** Night by default, whatever the system setting; the person can switch to day. */
export function ThemeProvider ({
  children,
  initialScheme = DEFAULT_SCHEME,
}: {
  children: React.ReactNode;
  initialScheme?: ColorScheme;
}): React.JSX.Element {
  const [scheme, setScheme] = useState<ColorScheme>(initialScheme);
  const theme = useMemo<Theme>(() => ({
    scheme,
    colors: palettes[scheme],
    setScheme,
  }), [scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme (): Theme {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return theme;
}

import {
  render, screen,
} from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  ThemeProvider, useTheme,
} from './theme-provider';

function Probe (): React.JSX.Element {
  const { scheme, colors } = useTheme();
  const summary = [scheme, colors.background].join(' ');

  return <Text>{summary}</Text>;
}

describe('ThemeProvider', () => {
  it('starts in night water whatever the system says', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);

    expect(screen.getByText('dark #0B1A1C')).toBeTruthy();
  });

  it('refuses to be read outside its provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow('useTheme must be used inside ThemeProvider');
  });
});

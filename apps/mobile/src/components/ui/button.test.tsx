import {
  fireEvent, render, screen,
} from '@testing-library/react-native';
import {
  palettes, ThemeProvider,
} from '@/theme';
import { Button } from './button';

function renderButton (props: Partial<React.ComponentProps<typeof Button>> = {}): jest.Mock {
  const onPress = jest.fn();
  render(
    <ThemeProvider>
      <Button label="Fait" onPress={onPress} testID="button" {...props} />
    </ThemeProvider>,
  );

  return onPress;
}

describe('Button', () => {
  it('fires on press with the lagoon fill of the night palette', () => {
    const onPress = renderButton();

    fireEvent.press(screen.getByRole('button', { name: 'Fait' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('button')).toHaveStyle({ backgroundColor: palettes.dark.lagon });
  });

  it('ignores presses while loading and says it is busy', () => {
    const onPress = renderButton({ loading: true });

    fireEvent.press(screen.getByTestId('button'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('button').props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    expect(screen.queryByText('Fait')).toBeNull();
  });
});

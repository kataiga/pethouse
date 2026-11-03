import { Alert } from 'react-native';
import {
  fireEvent, renderRouter, screen, waitFor,
} from 'expo-router/testing-library';
import { changeLanguage } from '@/lib/i18n';
import {
  FakeApi, MemoryTokenStore,
} from '@/test-support/fake-api';

const mockFake = new FakeApi();
const mockStore = new MemoryTokenStore();

jest.mock('@/lib/api/client', () => jest.requireActual<typeof import('@/test-support/mock-client')>(
  '@/test-support/mock-client',
).mockClientModule(mockFake, mockStore));

// See the auth flow tests: the first navigation transforms the real layouts on a cold runner.
jest.setTimeout(15_000);

const DAY_MS = 86_400_000;

function confirmAlerts (): void {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });
}

function signIn (): { householdId: number;
  userId: number } {
  mockStore.value = mockFake.seedSignedIn('Camille');

  return {
    householdId: mockFake.householdOf('Camille').id,
    userId: mockFake.accountNamed('Camille').id,
  };
}

function daysAgo (days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function requests (method: string, pattern: RegExp): unknown[] {
  return mockFake.requests
    .filter((request) => request.method === method && pattern.test(request.path))
    .map((request) => request.body);
}

describe('Parameters', () => {
  beforeAll(() => {
    renderRouter({ index: () => null }).unmount();
  }, 60_000);

  beforeEach(async () => {
    jest.restoreAllMocks();
    mockFake.reset();
    mockStore.value = null;
    jest.requireMock<{ mockRebuild: () => void }>('@/lib/api/client').mockRebuild();
    await changeLanguage('fr');
  });

  it('shows the latest readings, out-of-range ones in amber, and badges the tank on the list', async () => {
    const { householdId, userId } = signIn();
    const salon = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const nano = mockFake.tanks.addTank(householdId, { name: 'Nano' });
    mockFake.parameters.addMeasurement(salon.id, 'ph', 8.2, daysAgo(1), userId);
    mockFake.parameters.addMeasurement(salon.id, 'temperature', 25, daysAgo(1), userId);
    mockFake.parameters.addMeasurement(nano.id, 'ph', 7, daysAgo(1), userId);
    renderRouter('./app', { initialUrl: '/tanks' });

    expect(await screen.findByTestId(`tank-${salon.id}-alert`)).toBeTruthy();
    expect(screen.getByLabelText('Une mesure est hors plage')).toBeTruthy();
    expect(screen.queryByTestId(`tank-${nano.id}-alert`)).toBeNull();

    fireEvent.press(screen.getByTestId(`tank-${salon.id}`));
    expect(await screen.findByText('8,2')).toBeTruthy();
    expect(screen.getByText('Hors plage')).toBeTruthy();
    expect(screen.getByText('25,0 °C')).toBeTruthy();
    expect(screen.getByText('Nitrates (NO₃)')).toBeTruthy();
    expect(screen.getByText('Pas encore de mesure')).toBeTruthy();
    // TDS is not tracked for aquariums by default.
    expect(screen.queryByTestId('tile-tds')).toBeNull();
  });

  it('records a test session in one go, refusing a value with too many decimals', async () => {
    const { householdId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}` });

    fireEvent.press(await screen.findByTestId('parameters-measure'));
    fireEvent.changeText(await screen.findByTestId('measure-ph'), '7,0');
    fireEvent.changeText(screen.getByTestId('measure-no3'), '30');
    expect(screen.getByText('Hors plage')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('measure-temperature'), '24,55');
    expect(screen.getByText('Trop de décimales pour ce paramètre.')).toBeTruthy();
    expect(screen.getByTestId('measure-submit').props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.changeText(screen.getByTestId('measure-temperature'), '24,5');
    fireEvent.press(screen.getByTestId('measure-at-date'));
    fireEvent.press(screen.getByTestId('measure-at-picker'));
    fireEvent.changeText(screen.getByTestId('measure-note'), 'Après le changement d’eau');
    fireEvent.press(screen.getByTestId('measure-submit'));

    expect(await screen.findByText('30 mg/L')).toBeTruthy();
    expect(screen).toHavePathname(`/tanks/${tank.id}`);
    expect(screen.getByText('7,0')).toBeTruthy();
    expect(screen.getByText('24,5 °C')).toBeTruthy();
    const sent = requests('POST', /\/measurements$/);
    expect(sent).toHaveLength(3);
    expect(sent).toEqual(expect.arrayContaining([expect.objectContaining({
      parameterDefinitionId: mockFake.parameters.definition('no3').id,
      value: 30,
      note: 'Après le changement d’eau',
      measuredAt: expect.stringMatching(/^2026-01-1[45]T/),
    })]));
    expect(new Set(sent.map((body) => JSON.stringify(body).match(/"measuredAt":"([^"]+)"/)?.[1])).size).toBe(1);
  });

  it('keeps in the form only the readings that could not be saved', async () => {
    const { householdId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}/measure` });

    fireEvent.changeText(await screen.findByTestId('measure-ph'), '7,1');
    fireEvent.changeText(screen.getByTestId('measure-no3'), '10');
    // Someone stops tracking nitrate on this tank meanwhile: the API refuses that reading.
    mockFake.parameters.overrides.set(`${tank.id}:${mockFake.parameters.definition('no3').id}`, {
      enabled: false,
      min: null,
      max: null,
    });
    fireEvent.press(screen.getByTestId('measure-submit'));

    expect(await screen.findByText('1 sur 2 mesures enregistrées. Réessaie pour les autres.')).toBeTruthy();
    expect(screen.getByTestId('measure-ph').props.value).toBe('');
    expect(mockFake.parameters.measurements.map((measurement) => measurement.value)).toEqual([7.1]);
    // The form reloads what the tank tracks: nitrate is gone from it, so it is no longer offered.
    await waitFor(() => expect(screen.queryByTestId('measure-no3') === null).toBe(true));
  });

  it('changes the account settings for a tank type, sending only what changed', async () => {
    const { householdId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const view = renderRouter('./app', { initialUrl: '/account' });

    fireEvent.press(await screen.findByTestId('account-parameters'));
    expect(await screen.findByTestId('setting-ph')).toBeTruthy();
    expect(screen.getByTestId('setting-ph-min').props.value).toBe('6,5');
    fireEvent.changeText(screen.getByTestId('setting-ph-min'), '8');
    fireEvent.changeText(screen.getByTestId('setting-ph-max'), '7');
    fireEvent.press(screen.getByTestId('settings-save'));
    expect(await screen.findByText('Le maximum doit être supérieur au minimum.')).toBeTruthy();
    expect(requests('PUT', /parameter-settings/)).toHaveLength(0);

    fireEvent.changeText(screen.getByTestId('setting-ph-min'), '6,8');
    fireEvent.changeText(screen.getByTestId('setting-ph-max'), '7,2');
    fireEvent(screen.getByTestId('setting-tds-enabled'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('settings-save'));

    expect(await screen.findByText('Réglages enregistrés.')).toBeTruthy();
    expect(requests('PUT', /parameter-settings\/AQUARIUM$/)).toEqual([{
      settings: [
        {
          parameterDefinitionId: mockFake.parameters.definition('ph').id,
          enabled: true,
          minThreshold: 6.8,
          maxThreshold: 7.2,
        },
        {
          parameterDefinitionId: mockFake.parameters.definition('tds').id,
          enabled: true,
          minThreshold: null,
          maxThreshold: null,
        },
      ],
    }]);

    // Terrariums keep their own settings.
    fireEvent.press(screen.getByTestId('settings-type-TERRARIUM'));
    expect(await screen.findByTestId('setting-humidity')).toBeTruthy();
    expect(screen.getByTestId('setting-temperature-min').props.value).toBe('24,0');

    // The aquarium follows the account.
    mockFake.parameters.addMeasurement(tank.id, 'tds', 180, daysAgo(0), mockFake.accountNamed('Camille').id);
    view.unmount();
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}` });
    expect(await screen.findByText('180 ppm')).toBeTruthy();
  });

  it('adds a household parameter, refuses a duplicate, and deletes it with its readings', async () => {
    signIn();
    confirmAlerts();
    renderRouter('./app', { initialUrl: '/account/parameters' });

    fireEvent.changeText(await screen.findByTestId('custom-definition-name'), 'pH');
    fireEvent.press(screen.getByTestId('custom-definition-add'));
    expect(await screen.findByText('Ce paramètre existe déjà dans le foyer.')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('custom-definition-name'), 'Redox');
    fireEvent.changeText(screen.getByTestId('custom-definition-unit'), 'mV');
    fireEvent.press(screen.getByTestId('custom-definition-decimals-0'));
    fireEvent.press(screen.getByTestId('custom-definition-add'));

    expect(await screen.findByTestId('setting-redox')).toBeTruthy();
    expect(screen.getByText('Redox (mV)')).toBeTruthy();
    expect(screen.getByText('Paramètre du foyer')).toBeTruthy();
    expect(screen.getByTestId('custom-definition-name').props.value).toBe('');

    fireEvent.press(screen.getByTestId('setting-redox-delete'));
    await waitFor(() => expect(screen.queryByTestId('setting-redox') === null).toBe(true));
    expect(mockFake.parameters.definitions.some((definition) => definition.slug === 'redox')).toBe(false);
  });

  it('lets a tank deviate from the account, then follow it again', async () => {
    const { householdId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const tds = mockFake.parameters.definition('tds').id;
    const ph = mockFake.parameters.definition('ph').id;
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}` });

    fireEvent.press(await screen.findByTestId('parameters-manage'));
    expect(await screen.findByTestId('override-tds')).toBeTruthy();
    fireEvent(screen.getByTestId('override-tds-enabled'), 'valueChange', true);
    await waitFor(() => expect(mockFake.parameters.overrides.get(`${tank.id}:${tds}`)).toEqual({
      enabled: true,
      min: null,
      max: null,
    }));
    expect(await screen.findByText('Ce bac')).toBeTruthy();

    expect(screen.getByText('Laisse vide pour garder les seuils du compte : 6,5 – 7,5.')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('override-ph-min'), '7');
    fireEvent.press(screen.getByTestId('override-ph-save'));
    await waitFor(() => expect(mockFake.parameters.overrides.get(`${tank.id}:${ph}`)).toEqual({
      enabled: null,
      min: 7,
      max: null,
    }));

    // Switching TDS back to what the account says is no deviation: the row goes away.
    fireEvent(await screen.findByTestId('override-tds-enabled'), 'valueChange', false);
    await waitFor(() => expect(mockFake.parameters.overrides.has(`${tank.id}:${tds}`)).toBe(false));

    fireEvent.press(await screen.findByTestId('override-ph-reset'));
    await waitFor(() => expect(mockFake.parameters.overrides.has(`${tank.id}:${ph}`)).toBe(false));
    expect(requests('DELETE', new RegExp(`/parameters/${ph}$`))).toHaveLength(1);
  });

  it('charts a parameter with its band, and corrects or deletes readings page by page', async () => {
    const { householdId, userId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const ph = mockFake.parameters.definition('ph').id;
    for (let day = 1; day <= 21; day += 1) {
      mockFake.parameters.addMeasurement(tank.id, 'ph', 7, daysAgo(day), userId);
    }
    const high = mockFake.parameters.addMeasurement(tank.id, 'ph', 8.1, daysAgo(0.5), userId);
    confirmAlerts();
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}/parameters/${ph}` });

    fireEvent(await screen.findByTestId('history-chart'), 'layout', { nativeEvent: { layout: {
      width: 320,
      height: 220,
    } } });
    expect(await screen.findByTestId('history-band')).toBeTruthy();
    expect(screen.getAllByTestId('history-point-alert').length).toBe(1);
    expect(screen.getByText('6,5 – 7,5')).toBeTruthy();

    fireEvent.press(screen.getByTestId('history-period-week'));
    await waitFor(() => expect(mockFake.requests.some((request) => request.path.endsWith('/history')
      && request.method === 'GET')).toBe(true));

    expect(await screen.findByText('8,1')).toBeTruthy();
    expect(screen.getAllByText('7,0').length).toBe(19);
    fireEvent.press(screen.getByTestId('readings-more'));
    await waitFor(() => expect(screen.getAllByText('7,0').length).toBe(21));
    expect(screen.queryByTestId('readings-more')).toBeNull();

    fireEvent.press(screen.getByTestId(`reading-${high.id}-toggle`));
    fireEvent.changeText(screen.getByTestId(`reading-${high.id}-value`), '7,1');
    fireEvent.press(screen.getByTestId(`reading-${high.id}-save`));
    expect(await screen.findByText('7,1')).toBeTruthy();
    expect(high.value).toBe(7.1);

    const oldest = mockFake.parameters.measurements[0];
    fireEvent.press(screen.getByTestId(`reading-${oldest?.id ?? 0}-toggle`));
    fireEvent.press(screen.getByTestId(`reading-${oldest?.id ?? 0}-delete`));
    await waitFor(() => expect(screen.queryByTestId(`reading-${oldest?.id ?? 0}`) === null).toBe(true));
    expect(mockFake.parameters.measurements).toHaveLength(21);
  });
});

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

/** Confirms every native alert by pressing its destructive button. */
function confirmAlerts (): void {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });
}

function signInAs (displayName: string): void {
  mockStore.value = mockFake.seedSignedIn(displayName);
}

describe('Household', () => {
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

  it('lets an owner rename the household and manage a member', async () => {
    signInAs('Camille');
    const household = mockFake.householdOf('Camille');
    const jordan = mockFake.addMember(household, 'Jordan');
    confirmAlerts();
    renderRouter('./app', { initialUrl: '/household' });

    expect(await screen.findByText('Mon foyer')).toBeTruthy();
    expect(await screen.findByText('Camille (toi)')).toBeTruthy();
    expect(screen.getByText('Jordan')).toBeTruthy();

    fireEvent.press(screen.getByTestId('household-rename'));
    fireEvent.changeText(screen.getByTestId('household-name'), 'La maison du lac');
    fireEvent.press(screen.getByTestId('household-name-save'));
    expect(await screen.findByText('La maison du lac')).toBeTruthy();

    fireEvent.press(screen.getByTestId(`member-${jordan.id}-role`));
    await waitFor(() => expect(household.members.find((member) => member.userId === jordan.id)?.role).toBe('OWNER'));

    fireEvent.press(screen.getByTestId(`member-${jordan.id}-remove`));
    await waitFor(() => expect(screen.queryByText('Jordan') === null).toBe(true));
    expect(household.members.map((member) => member.userId)).toEqual([mockFake.accountNamed('Camille').id]);
  });

  it('refuses to let the last owner leave, with the reason', async () => {
    signInAs('Camille');
    confirmAlerts();
    renderRouter('./app', { initialUrl: '/household' });
    await screen.findByText('Camille (toi)');

    fireEvent.press(screen.getByTestId('member-leave'));

    expect(await screen.findByText(/Le foyer doit garder au moins un propriétaire/)).toBeTruthy();
  });

  it('shows a member no owner action, and lets them leave', async () => {
    signInAs('Camille');
    const household = mockFake.householdOf('Camille');
    const jordan = mockFake.addMember(household, 'Jordan');
    // Jordan signs in instead of Camille.
    mockStore.value = null;
    mockFake.requests.length = 0;
    const jordanToken = await (async () => {
      const response = await mockFake.fetch(new Request('http://api.test/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: jordan.email,
          password: 'correct horse battery',
        }),
      }));

      return (await response.json() as { tokens: { refreshToken: string } }).tokens.refreshToken;
    })();
    mockStore.value = jordanToken;
    confirmAlerts();
    renderRouter('./app', { initialUrl: '/household' });

    expect(await screen.findByText('Jordan (toi)')).toBeTruthy();
    expect(screen.queryByTestId('household-rename')).toBeNull();
    expect(screen.queryByTestId('household-invite')).toBeNull();
    expect(screen.queryByTestId(`member-${mockFake.accountNamed('Camille').id}-remove`)).toBeNull();

    fireEvent.press(screen.getByTestId('member-leave'));

    // Jordan falls back to the household of their own account.
    await waitFor(() => expect(household.members.some((member) => member.userId === jordan.id)).toBe(false));
  });

  it('creates and revokes an invite link', async () => {
    signInAs('Camille');
    renderRouter('./app', { initialUrl: '/household' });
    fireEvent.press(await screen.findByTestId('household-invite'));

    expect(await screen.findByText('Aucune invitation en cours.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('invite-create'));

    const invite = await waitFor(() => {
      const created = mockFake.invites.at(-1);
      expect(created).toBeDefined();

      return created;
    });
    expect(await screen.findByText(`pethouse://invite/${invite?.code ?? ''}`)).toBeTruthy();
    expect(screen.getByText(/0 sur 10 utilisations/)).toBeTruthy();

    fireEvent.press(screen.getByTestId(`invite-${invite?.id ?? 0}-revoke`));
    expect(await screen.findByText('Aucune invitation en cours.')).toBeTruthy();
  });

  it('opens an invite link while signed out, signs in, and joins on confirmation', async () => {
    signInAs('Camille');
    const camilleHousehold = mockFake.householdOf('Camille');
    camilleHousehold.name = 'Chez Camille';
    mockFake.invites.push({
      id: 900,
      householdId: camilleHousehold.id,
      code: 'Ab3_x-9kLmNo',
      maxUses: 10,
      useCount: 0,
      revokedAt: null,
    });
    mockStore.value = null;
    mockFake.seedSignedIn('Jordan');
    const jordanHousehold = mockFake.householdOf('Jordan');
    renderRouter('./app', { initialUrl: '/invite/Ab3_x-9kLmNo' });

    expect(await screen.findByText('Connexion')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('sign-in-email'), 'jordan@example.com');
    fireEvent.changeText(screen.getByTestId('sign-in-password'), 'correct horse battery');
    expect(screen).toHavePathnameWithParams('/sign-in?next=%2Finvite%2FAb3_x-9kLmNo');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(await screen.findByText('Rejoindre un foyer')).toBeTruthy();
    expect(screen).toHavePathname('/invite/Ab3_x-9kLmNo');
    // Nothing happens before the person confirms.
    expect(mockFake.requests.some((request) => request.path.endsWith('/redeem'))).toBe(false);

    fireEvent.press(screen.getByTestId('redeem-submit'));

    expect(await screen.findByText('Chez Camille')).toBeTruthy();
    expect(await screen.findByText('Jordan (toi)')).toBeTruthy();
    expect(screen.getByText('Camille')).toBeTruthy();
    // The empty household Jordan got at sign-up is gone.
    expect(mockFake.households).not.toContain(jordanHousehold);
  });

  it('says so when an invite is no longer valid, and reads codes out of pasted links', async () => {
    signInAs('Jordan');
    renderRouter('./app', { initialUrl: '/household/join' });

    fireEvent.changeText(await screen.findByTestId('join-code'), 'n’importe quoi');
    fireEvent.press(screen.getByTestId('join-submit'));
    expect(screen.getByText('Ce n’est ni un lien ni un code d’invitation.')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('join-code'), 'Rejoins-moi : pethouse://invite/Zz9_unknown1');
    fireEvent.press(screen.getByTestId('join-submit'));
    expect(await screen.findByText('Zz9_unknown1')).toBeTruthy();

    fireEvent.press(screen.getByTestId('redeem-submit'));
    expect(await screen.findByText('Cette invitation n’existe pas, a expiré ou a déjà servi.')).toBeTruthy();
  });

  it('saves the account language, which is also the language of notifications', async () => {
    signInAs('Camille');
    renderRouter('./app', { initialUrl: '/account' });
    await screen.findByTestId('account-name');

    fireEvent.press(screen.getByTestId('language-en'));

    expect(await screen.findByText('Display')).toBeTruthy();
    await waitFor(() => expect(mockFake.accountNamed('Camille').preferredLanguage).toBe('en'));

    fireEvent.changeText(screen.getByTestId('account-name'), 'Cam');
    fireEvent.press(screen.getByTestId('account-name-save'));
    await waitFor(() => expect(mockFake.accounts.some((account) => account.displayName === 'Cam')).toBe(true));
  });
});

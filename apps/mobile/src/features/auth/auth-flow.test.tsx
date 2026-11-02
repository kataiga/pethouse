import {
  fireEvent, renderRouter, screen,
} from 'expo-router/testing-library';
import type { ApiClient } from '@pethouse/api-client';
import { changeLanguage } from '@/lib/i18n';
import {
  FakeApi, MemoryTokenStore,
} from '@/test-support/fake-api';
import type { Session } from './api/session';

const mockFake = new FakeApi();
const mockStore = new MemoryTokenStore();

// The real generated clients, session and routes; only the network and the keychain are
// replaced. The module is rebuilt for every test behind getters, so the routes, the middleware
// and the session always share one fresh instance.
jest.mock('@/lib/api/client', () => {
  const { createApiClient: create } = jest.requireActual<typeof import('@pethouse/api-client')>(
    '@pethouse/api-client',
  );
  const { authMiddleware } = jest.requireActual<typeof import('@/lib/api/auth-middleware')>(
    '@/lib/api/auth-middleware',
  );
  const { Session: RealSession } = jest.requireActual<typeof import('./api/session')>('./api/session');
  const build = (): { authApi: ApiClient;
    api: ApiClient;
    session: Session } => {
    const authApi = create({
      baseUrl: 'http://api.test',
      fetch: (request: Request) => mockFake.fetch(request),
    });
    const session = new RealSession(authApi, mockStore);
    const api = create({
      baseUrl: 'http://api.test',
      fetch: (request: Request) => mockFake.fetch(request),
    });
    api.use(authMiddleware(session));

    return {
      authApi,
      api,
      session,
    };
  };
  let current = build();

  return {
    API_URL: 'http://api.test',
    get authApi () {
      return current.authApi;
    },
    get api () {
      return current.api;
    },
    get session () {
      return current.session;
    },
    mockRebuild: () => {
      current = build();
    },
  };
});

// A cold CI runner transforms the real layouts and screens on the first navigation, which costs
// about 1.5 s locally without a cache and several times that on CI; the flows themselves take
// about 100 ms once warm.
jest.setTimeout(15_000);

describe('Auth flow', () => {
  // The first router render loads expo-router and react-navigation on demand; pay it here, under
  // a timeout of its own, so the tests' timeouts measure the flows only.
  beforeAll(() => {
    renderRouter({ index: () => null }).unmount();
  }, 60_000);

  beforeEach(async () => {
    mockFake.offline = false;
    mockFake.requests.length = 0;
    mockStore.value = null;
    jest.requireMock<{ mockRebuild: () => void }>('@/lib/api/client').mockRebuild();
    await changeLanguage('fr');
  });

  it('sends a signed-out person to sign-in, then home once signed in', async () => {
    mockFake.seedSignedIn('Camille');
    renderRouter('./app', { initialUrl: '/' });

    expect(await screen.findByText('Connexion')).toBeTruthy();
    expect(screen).toHavePathname('/sign-in');

    fireEvent.changeText(screen.getByTestId('sign-in-email'), 'camille@example.com');
    fireEvent.changeText(screen.getByTestId('sign-in-password'), 'correct horse battery');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(await screen.findByText('Bonjour Camille')).toBeTruthy();
    expect(screen).toHavePathname('/');
    expect(await screen.findByText('Mon foyer')).toBeTruthy();
    const households = mockFake.requests.find((request) => request.path === '/api/households');
    expect(households?.authorization).toMatch(/^Bearer access-/);
    expect(mockStore.value).toMatch(/^refresh-/);
  });

  it('says so when the email or password is wrong', async () => {
    renderRouter('./app', { initialUrl: '/sign-in' });
    await screen.findByText('Connexion');

    fireEvent.changeText(screen.getByTestId('sign-in-email'), 'nobody@example.com');
    fireEvent.changeText(screen.getByTestId('sign-in-password'), 'wrong password');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(await screen.findByText('E-mail ou mot de passe incorrect.')).toBeTruthy();
    expect(screen).toHavePathname('/sign-in');
  });

  it('checks the sign-up form before calling the server, and reports a taken email', async () => {
    mockFake.seedSignedIn('Camille');
    renderRouter('./app', { initialUrl: '/sign-up' });
    await screen.findByText('Créer un compte');

    fireEvent.changeText(screen.getByTestId('sign-up-email'), 'camille@');
    fireEvent.changeText(screen.getByTestId('sign-up-password'), 'short');
    fireEvent.press(screen.getByTestId('sign-up-submit'));

    expect(screen.getByText('Saisis une adresse e-mail valide.')).toBeTruthy();
    expect(screen.getByText('Au moins 8 caractères.')).toBeTruthy();
    expect(screen.getByText('Indique comment les membres de ton foyer t’appellent.')).toBeTruthy();
    expect(mockFake.requests).toEqual([]);

    fireEvent.changeText(screen.getByTestId('sign-up-name'), 'Camille');
    fireEvent.changeText(screen.getByTestId('sign-up-email'), 'camille@example.com');
    fireEvent.changeText(screen.getByTestId('sign-up-password'), 'another long password');
    fireEvent.press(screen.getByTestId('sign-up-submit'));

    expect(await screen.findByText('Un compte existe déjà avec cet e-mail.')).toBeTruthy();
  });

  it('creates an account in the UI language and lands home', async () => {
    renderRouter('./app', { initialUrl: '/sign-up' });
    await screen.findByText('Créer un compte');
    fireEvent.press(screen.getByTestId('language-en'));
    expect(await screen.findByText('Create an account')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('sign-up-name'), 'Jordan');
    fireEvent.changeText(screen.getByTestId('sign-up-email'), 'jordan@example.com');
    fireEvent.changeText(screen.getByTestId('sign-up-password'), 'another long password');
    fireEvent.press(screen.getByTestId('sign-up-submit'));

    expect(await screen.findByText('Hello Jordan')).toBeTruthy();
    expect(mockFake.requests.find((request) => request.path === '/api/auth/register')?.body).toMatchObject({
      displayName: 'Jordan',
      email: 'jordan@example.com',
      preferredLanguage: 'en',
      timezone: 'Europe/Paris',
    });
  });

  it('resumes a stored session at launch and signs out back to sign-in', async () => {
    mockStore.value = mockFake.seedSignedIn('Camille');
    renderRouter('./app', { initialUrl: '/' });

    expect(await screen.findByText('Bonjour Camille')).toBeTruthy();

    fireEvent.press(screen.getByTestId('sign-out'));

    expect(await screen.findByText('Connexion')).toBeTruthy();
    expect(screen).toHavePathname('/sign-in');
    expect(mockStore.value).toBeNull();
    expect(mockFake.requests.at(-1)?.path).toBe('/api/auth/logout');
  });

  it('keeps the session when the server is unreachable at launch, and resumes on retry', async () => {
    mockStore.value = mockFake.seedSignedIn('Camille');
    mockFake.offline = true;
    renderRouter('./app', { initialUrl: '/' });

    expect(await screen.findByText('Serveur injoignable')).toBeTruthy();
    expect(mockStore.value).not.toBeNull();

    mockFake.offline = false;
    fireEvent.press(screen.getByTestId('unreachable-retry'));

    expect(await screen.findByText('Bonjour Camille')).toBeTruthy();
  });
});

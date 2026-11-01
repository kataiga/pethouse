import {
  fireEvent, render, screen,
} from '@testing-library/react-native';
import { AppProviders } from '@/app-providers';
import { changeLanguage } from '@/lib/i18n';
import { WelcomeScreen } from './welcome-screen';

const mockFetch = jest.fn<Promise<Response>, [Request]>();

// The real generated client, with only the network replaced.
jest.mock('@/lib/api/client', () => {
  const { createApiClient } = jest.requireActual<typeof import('@pethouse/api-client')>('@pethouse/api-client');

  return {
    api: createApiClient({
      baseUrl: 'http://api.test',
      fetch: (request: Request) => mockFetch(request),
    }),
  };
});

function healthResponse (status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderScreen (): void {
  render(
    <AppProviders>
      <WelcomeScreen />
    </AppProviders>,
  );
}

describe('WelcomeScreen', () => {
  beforeEach(async () => {
    mockFetch.mockReset();
    await changeLanguage('fr');
  });

  it('reaches the API through the generated client', async () => {
    mockFetch.mockResolvedValue(healthResponse(200, {
      status: 'ok',
      details: {},
    }));
    renderScreen();

    expect(screen.getByText('Connexion au serveur…')).toBeTruthy();
    expect(await screen.findByText('Serveur joignable')).toBeTruthy();
    expect(mockFetch.mock.calls[0]?.[0].url).toBe('http://api.test/api/health');
  });

  it('reports degraded services from the 503 body', async () => {
    mockFetch.mockResolvedValue(healthResponse(503, {
      status: 'error',
      details: { database: { status: 'down' } },
    }));
    renderScreen();

    expect(await screen.findByText('Serveur joignable, services dégradés')).toBeTruthy();
  });

  it('offers a retry when the server cannot be reached', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    renderScreen();

    // One automatic retry, then the error state.
    expect(await screen.findByText('Serveur injoignable', {}, { timeout: 5000 })).toBeTruthy();
    mockFetch.mockResolvedValue(healthResponse(200, {
      status: 'ok',
      details: {},
    }));
    fireEvent.press(screen.getByText('Réessayer'));
    expect(await screen.findByText('Serveur joignable')).toBeTruthy();
  });

  it('switches the whole screen between French and English', async () => {
    mockFetch.mockResolvedValue(healthResponse(200, {
      status: 'ok',
      details: {},
    }));
    renderScreen();
    await screen.findByText('Serveur joignable');

    fireEvent.press(screen.getByTestId('language-en'));

    expect(await screen.findByText('Aquariums, terrariums and paludariums, looked after together.')).toBeTruthy();
    expect(screen.getByText('Server reachable')).toBeTruthy();

    fireEvent.press(screen.getByTestId('language-fr'));

    expect(await screen.findByText('Aquariums, terrariums et paludariums, entretenus à plusieurs.')).toBeTruthy();
  });
});

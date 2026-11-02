import {
  type ApiClient, createApiClient,
} from '@pethouse/api-client';
import { Session } from '@/features/auth/api/session';
import { authMiddleware } from '@/lib/api/auth-middleware';
import type {
  FakeApi, MemoryTokenStore,
} from './fake-api';

export interface MockClientModule {
  API_URL: string;
  readonly authApi: ApiClient;
  readonly api: ApiClient;
  readonly session: Session;
  mockRebuild: () => void;
}

/**
 * Stands in for `@/lib/api/client` in screen tests: the real generated clients, middleware and
 * session over a fake network and keychain, rebuilt per test behind getters so routes,
 * middleware and session always share one fresh instance. Use it from a `jest.mock` factory:
 * `jest.mock('@/lib/api/client', () => jest.requireActual('@/test-support/mock-client')
 *   .mockClientModule(mockFake, mockStore))`.
 */
export function mockClientModule (fake: FakeApi, store: MemoryTokenStore): MockClientModule {
  const build = (): { authApi: ApiClient;
    api: ApiClient;
    session: Session } => {
    const fetch = (request: Request): Promise<Response> => fake.fetch(request);
    const authApi = createApiClient({
      baseUrl: 'http://api.test',
      fetch,
    });
    const session = new Session(authApi, store);
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetch,
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
}

import { createApiClient } from '@pethouse/api-client';
import { authMiddleware } from './auth-middleware';

describe('authMiddleware', () => {
  const source = {
    accessTokenForRequest: jest.fn<Promise<string | null>, []>(),
    handleUnauthorized: jest.fn<Promise<string | null>, []>(),
  };
  const seen: Request[] = [];
  let status = 200;

  function client (): ReturnType<typeof createApiClient> {
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetch: (request: Request) => {
        seen.push(request);

        return Promise.resolve(new Response('[]', {
          status,
          headers: { 'Content-Type': 'application/json' },
        }));
      },
    });
    api.use(authMiddleware(source));

    return api;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    seen.length = 0;
    status = 200;
    source.accessTokenForRequest.mockResolvedValue('access-1');
    source.handleUnauthorized.mockResolvedValue('access-2');
  });

  it('attaches the access token to API calls', async () => {
    await client().GET('/api/households');

    expect(seen[0]?.headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('sends auth calls without a token', async () => {
    await client().POST('/api/auth/login', {
      body: {
        email: 'a@example.com',
        password: 'secret-password',
      },
    });

    expect(seen[0]?.headers.get('Authorization')).toBeNull();
    expect(source.accessTokenForRequest).not.toHaveBeenCalled();
  });

  it('sends no header when signed out', async () => {
    source.accessTokenForRequest.mockResolvedValue(null);

    await client().GET('/api/households');

    expect(seen[0]?.headers.get('Authorization')).toBeNull();
  });

  it('lets the session renew after a 401 on an API call, never on an auth call', async () => {
    status = 401;

    await client().GET('/api/households');
    await client().POST('/api/auth/refresh', { body: { refreshToken: 'dead' } });

    expect(source.handleUnauthorized).toHaveBeenCalledTimes(1);
  });
});

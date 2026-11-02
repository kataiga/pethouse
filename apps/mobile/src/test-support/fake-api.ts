import type { Schemas } from '@pethouse/api-client';

type AuthResponse = Schemas['AuthResponseDto'];

interface Account {
  id: number;
  email: string;
  password: string;
  displayName: string;
  preferredLanguage: 'fr' | 'en';
}

function json (status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * An in-memory Pethouse API for screen and session tests: register, login, rotating refresh
 * tokens, logout, `/api/households`. It answers with the real API's status codes and shapes, and
 * records every request so tests can assert what the app sent.
 */
export class FakeApi {
  readonly requests: { method: string;
    path: string;
    authorization: string | null;
    body: unknown }[] = [];

  /** Simulates a server or network outage. */
  offline = false;

  private readonly accounts: Account[] = [];

  private readonly refreshTokens = new Map<string, number>();

  private readonly accessTokens = new Map<string, number>();

  private counter = 0;

  /** Seeds an account and returns a valid refresh token for it, as if it had signed in before. */
  seedSignedIn (displayName = 'Camille'): string {
    const account = this.addAccount(`${displayName.toLowerCase()}@example.com`, 'correct horse battery', displayName);

    return this.issue(account).tokens.refreshToken;
  }

  readonly fetch = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const text = request.method === 'GET' ? '' : await request.text();
    const body: unknown = text ? JSON.parse(text) : undefined;
    this.requests.push({
      method: request.method,
      path: url.pathname,
      authorization: request.headers.get('Authorization'),
      body,
    });

    if (this.offline) {
      throw new TypeError('Network request failed');
    }

    return this.route(request.method, url.pathname, body, request.headers.get('Authorization'));
  };

  private route (method: string, path: string, body: unknown, authorization: string | null): Response {
    const fields = (body ?? {}) as Record<string, string>;

    if (method === 'POST' && path === '/api/auth/register') {
      if (this.accounts.some((account) => account.email === fields.email)) {
        return json(409, {
          statusCode: 409,
          message: 'An account already exists for this email',
        });
      }

      const account = this.addAccount(fields.email ?? '', fields.password ?? '', fields.displayName ?? '');
      account.preferredLanguage = fields.preferredLanguage === 'en' ? 'en' : 'fr';

      return json(201, this.issue(account));
    }

    if (method === 'POST' && path === '/api/auth/login') {
      const account = this.accounts.find(
        (candidate) => candidate.email === fields.email && candidate.password === fields.password,
      );

      return account
        ? json(200, this.issue(account))
        : json(401, {
          statusCode: 401,
          message: 'Invalid email or password',
        });
    }

    if (method === 'POST' && path === '/api/auth/refresh') {
      const accountId = this.refreshTokens.get(fields.refreshToken ?? '');
      const account = this.accounts.find((candidate) => candidate.id === accountId);
      this.refreshTokens.delete(fields.refreshToken ?? '');

      return account
        ? json(200, this.issue(account))
        : json(401, {
          statusCode: 401,
          message: 'Invalid refresh token',
        });
    }

    if (method === 'POST' && path === '/api/auth/logout') {
      this.refreshTokens.delete(fields.refreshToken ?? '');

      return json(204);
    }

    const accountId = this.accessTokens.get((authorization ?? '').replace('Bearer ', ''));

    if (accountId === undefined) {
      return json(401, {
        statusCode: 401,
        message: 'Unauthorized',
      });
    }

    if (method === 'GET' && path === '/api/households') {
      return json(200, [{
        id: 1,
        name: 'Mon foyer',
        timezone: 'Europe/Paris',
        role: 'OWNER',
        createdAt: '2026-11-02T08:00:00.000Z',
      }]);
    }

    return json(404, {
      statusCode: 404,
      message: 'Not found',
    });
  }

  private addAccount (email: string, password: string, displayName: string): Account {
    this.counter += 1;
    const account: Account = {
      id: this.counter,
      email,
      password,
      displayName,
      preferredLanguage: 'fr',
    };
    this.accounts.push(account);

    return account;
  }

  private issue (account: Account): AuthResponse {
    this.counter += 1;
    const accessToken = `access-${this.counter}`;
    const refreshToken = `refresh-${this.counter}`;
    this.accessTokens.set(accessToken, account.id);
    this.refreshTokens.set(refreshToken, account.id);

    return {
      user: {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        preferredLanguage: account.preferredLanguage,
        createdAt: '2026-11-02T08:00:00.000Z',
      },
      tokens: {
        accessToken,
        accessExpiresInSeconds: 900,
        refreshToken,
        refreshExpiresInSeconds: 30 * 24 * 60 * 60,
      },
    };
  }
}

/** A TokenStore in memory, inspectable by tests. */
export class MemoryTokenStore {
  value: string | null = null;

  read (): Promise<string | null> {
    return Promise.resolve(this.value);
  }

  write (refreshToken: string): Promise<void> {
    this.value = refreshToken;

    return Promise.resolve();
  }

  clear (): Promise<void> {
    this.value = null;

    return Promise.resolve();
  }
}

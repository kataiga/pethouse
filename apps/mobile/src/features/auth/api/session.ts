import type {
  ApiClient, Schemas,
} from '@pethouse/api-client';
import type { TokenStore } from './token-store';

export type SessionUser = Schemas['UserResponseDto'];

export type AuthResponse = Schemas['AuthResponseDto'];

export type SessionState =
  | { status: 'restoring' }
  /** The server could not be reached at launch; the stored session is kept for a retry. */
  | { status: 'unreachable' }
  | { status: 'signedOut' }
  | {
    status: 'signedIn';
    user: SessionUser;
  };

type RefreshOutcome =
  | { kind: 'ok';
    response: AuthResponse }
  | { kind: 'rejected' }
  | { kind: 'network' };

/** Renew a little before expiry so a request never leaves with a token about to lapse. */
const RENEW_MARGIN_MS = 60_000;

/**
 * Owns the tokens. The access token lives in memory with its expiry; the refresh token in the
 * device's secure store, so a restart resumes the session through one refresh. Renewals are
 * single-flight: concurrent requests share one refresh, since a refresh token is single use and
 * the API revokes the whole family when one is replayed.
 */
export class Session {
  private state: SessionState = { status: 'restoring' };

  private accessToken: string | null = null;

  private accessExpiresAt = 0;

  private renewal: Promise<string | null> | null = null;

  private readonly listeners = new Set<(state: SessionState) => void>();

  constructor (
    /** A client without the auth middleware: it only calls `/api/auth/*`. */
    private readonly authApi: ApiClient,
    private readonly store: TokenStore,
    private readonly now: () => number = Date.now,
  ) {}

  getState (): SessionState {
    return this.state;
  }

  subscribe (listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /** At launch, or after `unreachable`: resume from the stored refresh token, or start signed out. */
  async restore (): Promise<SessionState> {
    if (this.state.status === 'unreachable') {
      this.setState({ status: 'restoring' });
    }

    const refreshToken = await this.store.read();

    if (refreshToken === null) {
      this.setState({ status: 'signedOut' });
    } else {
      await this.renew();
    }

    return this.state;
  }

  /** After a successful register or login. */
  async signIn (response: AuthResponse): Promise<void> {
    await this.accept(response);
  }

  /** A valid access token for the next request, renewed first when close to expiry. */
  async accessTokenForRequest (): Promise<string | null> {
    if (this.state.status !== 'signedIn') {
      return null;
    }

    if (this.accessToken !== null && this.now() < this.accessExpiresAt - RENEW_MARGIN_MS) {
      return this.accessToken;
    }

    return this.renew();
  }

  /** The API refused the access token anyway (revoked, clock skew): try one renewal. */
  async handleUnauthorized (): Promise<string | null> {
    this.accessToken = null;

    return this.renew();
  }

  /** Revokes the refresh token on the server when it can, and forgets everything locally. */
  async signOut (): Promise<void> {
    const refreshToken = await this.store.read();

    if (refreshToken !== null) {
      try {
        await this.authApi.POST('/api/auth/logout', { body: { refreshToken } });
      } catch {
        // Offline: the local sign-out still happens; the token expires on its own.
      }
    }

    await this.forget();
  }

  private renew (): Promise<string | null> {
    this.renewal ??= this.doRenew().finally(() => {
      this.renewal = null;
    });

    return this.renewal;
  }

  private async doRenew (): Promise<string | null> {
    const refreshToken = await this.store.read();

    if (refreshToken === null) {
      await this.forget();

      return null;
    }

    const outcome = await this.callRefresh(refreshToken);

    switch (outcome.kind) {
      case 'ok':
        await this.accept(outcome.response);

        return this.accessToken;
      case 'rejected':
        await this.forget();

        return null;
      case 'network':
        // Keep the stored token: the next request, or a retry at launch, tries again.
        if (this.state.status === 'restoring') {
          this.setState({ status: 'unreachable' });
        }

        return null;
    }
  }

  private async callRefresh (refreshToken: string): Promise<RefreshOutcome> {
    try {
      const { data, response } = await this.authApi.POST('/api/auth/refresh', { body: { refreshToken } });

      if (data) {
        return {
          kind: 'ok',
          response: data,
        };
      }

      // 400 and 401 mean the token is unusable; a 5xx is the server's problem, not the session's.
      return response.status < 500 ? { kind: 'rejected' } : { kind: 'network' };
    } catch {
      return { kind: 'network' };
    }
  }

  private async accept (response: AuthResponse): Promise<void> {
    await this.store.write(response.tokens.refreshToken);
    this.accessToken = response.tokens.accessToken;
    this.accessExpiresAt = this.now() + response.tokens.accessExpiresInSeconds * 1000;
    this.setState({
      status: 'signedIn',
      user: response.user,
    });
  }

  private async forget (): Promise<void> {
    await this.store.clear();
    this.accessToken = null;
    this.accessExpiresAt = 0;
    this.setState({ status: 'signedOut' });
  }

  private setState (state: SessionState): void {
    this.state = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

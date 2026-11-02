import type { Middleware } from 'openapi-fetch';

/** The part of the session the middleware needs; keeps this file free of storage concerns. */
export interface AccessTokenSource {
  accessTokenForRequest (): Promise<string | null>;
  handleUnauthorized (): Promise<string | null>;
}

const AUTH_PATH = '/api/auth/';

/**
 * Attaches the access token to every request outside `/api/auth/*`. On a 401 it lets the session
 * renew once (or sign out when the refresh token is dead); the query's own retry then repeats the
 * request with the new token, since a sent request body cannot be replayed from here.
 */
export function authMiddleware (session: AccessTokenSource): Middleware {
  return {
    async onRequest ({ request }) {
      if (new URL(request.url).pathname.startsWith(AUTH_PATH)) {
        return undefined;
      }

      const token = await session.accessTokenForRequest();

      if (token !== null) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }

      return request;
    },
    async onResponse ({ request, response }) {
      if (response.status === 401 && !new URL(request.url).pathname.startsWith(AUTH_PATH)) {
        await session.handleUnauthorized();
      }

      return response;
    },
  };
}

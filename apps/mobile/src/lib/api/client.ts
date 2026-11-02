import { createApiClient } from '@pethouse/api-client';
import { secureTokenStore } from '@/features/auth/api/secure-token-store';
import { Session } from '@/features/auth/api/session';
import { authMiddleware } from './auth-middleware';

/** Set per EAS profile; the default reaches a local API from the Android emulator. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';

/** Register, login, refresh and logout only: these calls carry no access token. */
export const authApi = createApiClient({ baseUrl: API_URL });

export const session = new Session(authApi, secureTokenStore);

/** Every other call: the access token is attached and renewed on the way. */
export const api = createApiClient({ baseUrl: API_URL });
api.use(authMiddleware(session));

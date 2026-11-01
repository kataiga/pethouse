import { createApiClient } from '@pethouse/api-client';

/** Set per EAS profile; the default reaches a local API from the Android emulator. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';

export const api = createApiClient({ baseUrl: API_URL });

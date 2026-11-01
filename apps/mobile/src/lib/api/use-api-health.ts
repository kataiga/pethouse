import {
  useQuery, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from './client';

export type ApiHealth = Schemas['HealthResponseDto'];

export const apiHealthKey = ['health'] as const;

/** `/api/health` answers 503 with the same body when a dependency is down; both are data here. */
export function useApiHealth (): UseQueryResult<ApiHealth> {
  return useQuery({
    queryKey: apiHealthKey,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/health');
      const body = data ?? error;

      if (!body || !('status' in body)) {
        throw new Error('The server did not answer');
      }

      return body;
    },
  });
}

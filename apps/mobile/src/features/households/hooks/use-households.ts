import {
  useQuery, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';

export type Household = Schemas['HouseholdResponseDto'];

export const householdsKey = ['households'] as const;

export function useHouseholds (): UseQueryResult<Household[]> {
  return useQuery({
    queryKey: householdsKey,
    queryFn: async () => {
      const { data } = await api.GET('/api/households');

      if (!data) {
        throw new Error('Households could not be loaded');
      }

      return data;
    },
  });
}

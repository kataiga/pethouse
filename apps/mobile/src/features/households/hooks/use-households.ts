import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
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

/**
 * The household the app shows. V1 has one household per person in practice; when an account
 * belongs to several (its own default one plus one it joined), the most recently joined wins,
 * which is the last one: the API lists memberships by join date. A switcher can replace this
 * choice later without touching the screens, which only ever read the current household.
 */
export function pickCurrentHousehold (households: readonly Household[]): Household | null {
  return households.at(-1) ?? null;
}

export interface CurrentHousehold {
  household: Household | null;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useCurrentHousehold (): CurrentHousehold {
  const query = useHouseholds();

  return {
    household: query.data ? pickCurrentHousehold(query.data) : null,
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

export function useRenameHousehold (householdId: number): UseMutationResult<Household, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name) => {
      const { data } = await api.PATCH('/api/households/{householdId}', {
        params: { path: { householdId } },
        body: { name },
      });

      if (!data) {
        throw new Error('The household could not be renamed');
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdsKey }),
  });
}

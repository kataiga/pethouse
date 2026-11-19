import {
  useQuery, UseQueryResult,
} from '@tanstack/react-query';
import { todayKey } from '@/features/routines/hooks/keys';
import { api } from '@/lib/api/client';
import type { HouseholdOccurrence } from '../today-groups';

const DAY_MS = 86_400_000;

/** A week back for what was left undone, a week ahead for what is coming. */
export const TODAY_WINDOW = {
  pastDays: 7,
  aheadDays: 7,
};

export function useToday (householdId: number | null): UseQueryResult<HouseholdOccurrence[]> {
  return useQuery({
    queryKey: todayKey(householdId ?? -1),
    enabled: householdId !== null,
    queryFn: async () => {
      const now = Date.now();
      const { data } = await api.GET('/api/households/{householdId}/occurrences', {
        params: {
          path: { householdId: householdId ?? -1 },
          query: {
            from: new Date(now - TODAY_WINDOW.pastDays * DAY_MS).toISOString(),
            to: new Date(now + TODAY_WINDOW.aheadDays * DAY_MS).toISOString(),
          },
        },
      });

      if (!data) {
        throw new Error('Occurrences could not be loaded');
      }

      return data;
    },
  });
}

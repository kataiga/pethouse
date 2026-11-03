import {
  type InfiniteData, useInfiniteQuery, UseInfiniteQueryResult, useMutation, UseMutationResult, useQuery,
  useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';
import {
  historyKey, routineKey, routinesKey,
} from './keys';

export type Occurrence = Schemas['OccurrenceResponseDto'];

export type OccurrencePage = Schemas['OccurrencePageDto'];

const DAY_MS = 86_400_000;

/** What the detail screen shows: overdue ones from the past week and the next fortnight. */
export const OCCURRENCE_WINDOW = {
  pastDays: 7,
  aheadDays: 14,
};

export function useOccurrences (tankId: number, routineId: number): UseQueryResult<Occurrence[]> {
  return useQuery({
    queryKey: [...routineKey(tankId, routineId), 'occurrences'],
    queryFn: async () => {
      const now = Date.now();
      const { data } = await api.GET('/api/tanks/{tankId}/routines/{routineId}/occurrences', {
        params: {
          path: {
            tankId,
            routineId,
          },
          query: {
            from: new Date(now - OCCURRENCE_WINDOW.pastDays * DAY_MS).toISOString(),
            to: new Date(now + OCCURRENCE_WINDOW.aheadDays * DAY_MS).toISOString(),
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

export const HISTORY_PAGE_SIZE = 20;

/** Done, skipped and missed occurrences of a tank, newest first; optionally one routine's. */
export function useRoutineHistory (tankId: number, routineId: number | null):
UseInfiniteQueryResult<InfiniteData<OccurrencePage, number>> {
  return useInfiniteQuery({
    queryKey: [...historyKey(tankId), routineId],
    initialPageParam: 1,
    getNextPageParam: (last: OccurrencePage) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
    queryFn: async ({ pageParam }) => {
      const { data } = await api.GET('/api/tanks/{tankId}/routine-history', {
        params: {
          path: { tankId },
          query: {
            page: pageParam,
            limit: HISTORY_PAGE_SIZE,
            ...(routineId === null ? {} : { routineId }),
          },
        },
      });

      if (!data) {
        throw new Error('The history could not be loaded');
      }

      return data;
    },
  });
}

/** `conflict`: somebody already did or skipped it the other way. */
export type OccurrenceFailure = 'conflict' | 'failed';

export class OccurrenceError extends Error {
  constructor (readonly failure: OccurrenceFailure) {
    super(failure);
  }
}

export interface OccurrenceAction {
  occurrenceId: number;
  action: 'complete' | 'skip';
}

/** Done or skipped, from the app; the notification's "Done" button calls the same endpoint. */
export function useActOnOccurrence (tankId: number): UseMutationResult<Occurrence, OccurrenceError, OccurrenceAction> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ occurrenceId, action }) => {
      const params = { params: { path: { occurrenceId } } };
      const { data, response } = action === 'complete'
        ? await api.POST('/api/routine-occurrences/{occurrenceId}/complete', params)
        : await api.POST('/api/routine-occurrences/{occurrenceId}/skip', params);

      if (!data) {
        throw new OccurrenceError(response.status === 409 ? 'conflict' : 'failed');
      }

      return data;
    },
    onSettled: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: routinesKey(tankId) }),
      queryClient.invalidateQueries({ queryKey: historyKey(tankId) }),
    ]),
  });
}

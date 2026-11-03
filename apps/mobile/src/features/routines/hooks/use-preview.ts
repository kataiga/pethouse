import {
  keepPreviousData, useQuery, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';
import type { Schedule } from '../routine-form';

export type Preview = Schemas['RoutinePreviewResponseDto'];

export const PREVIEW_COUNT = 5;

/** The next occurrences a draft rule would give, in the household's zone; nothing is saved. */
export function usePreview (tankId: number, schedule: Schedule | null): UseQueryResult<Preview> {
  return useQuery({
    queryKey: ['tanks', tankId, 'routine-preview', schedule?.rrule, schedule?.dtstart],
    enabled: schedule !== null,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data } = await api.POST('/api/tanks/{tankId}/routines/preview', {
        params: { path: { tankId } },
        body: {
          rrule: schedule?.rrule ?? '',
          dtstart: schedule?.dtstart ?? '',
          count: PREVIEW_COUNT,
        },
      });

      if (!data) {
        throw new Error('The preview could not be computed');
      }

      return data;
    },
    retry: false,
  });
}

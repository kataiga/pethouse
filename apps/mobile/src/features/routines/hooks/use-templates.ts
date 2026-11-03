import {
  useQuery, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import type { TankType } from '@/features/tanks/hooks/use-tanks';
import { api } from '@/lib/api/client';

export type RoutineTemplate = Schemas['RoutineTemplateResponseDto'];

/** The routines suggested for a type of tank, in display order. */
export function useTemplates (tankType: TankType): UseQueryResult<RoutineTemplate[]> {
  return useQuery({
    queryKey: ['routine-templates', tankType],
    queryFn: async () => {
      const { data } = await api.GET('/api/routine-templates', { params: { query: { tankType } } });

      if (!data) {
        throw new Error('Routine templates could not be loaded');
      }

      return data;
    },
  });
}

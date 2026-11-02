import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';
import type { TankType } from './use-tanks';

export type Subtype = Schemas['TankSubtypeResponseDto'];

const subtypesKey = (tankType: TankType): readonly unknown[] => ['tank-subtypes', tankType];

/** The seeded subtypes plus the household's own, for one tank type. */
export function useSubtypes (tankType: TankType): UseQueryResult<Subtype[]> {
  return useQuery({
    queryKey: subtypesKey(tankType),
    queryFn: async () => {
      const { data } = await api.GET('/api/tank-subtypes', { params: { query: { tankType } } });

      if (!data) {
        throw new Error('Subtypes could not be loaded');
      }

      return data;
    },
  });
}

export function useCreateSubtype (householdId: number, tankType: TankType): UseMutationResult<Subtype, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name) => {
      const { data } = await api.POST('/api/households/{householdId}/subtypes', {
        params: { path: { householdId } },
        body: {
          tankType,
          name,
        },
      });

      if (!data) {
        throw new Error('The subtype could not be created');
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subtypesKey(tankType) }),
  });
}

import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';

export type Tank = Schemas['TankResponseDto'];

export type TankType = Tank['tankType'];

export const TANK_TYPES: readonly TankType[] = ['AQUARIUM', 'TERRARIUM', 'PALUDARIUM'];

/** Under the household key: leaving or switching household drops its tanks with it. */
export const tanksKey = (householdId: number): readonly unknown[] => ['households', householdId, 'tanks'];

export const tankKey = (tankId: number): readonly unknown[] => ['tanks', tankId];

export function useTanks (householdId: number | null): UseQueryResult<Tank[]> {
  return useQuery({
    queryKey: tanksKey(householdId ?? -1),
    enabled: householdId !== null,
    queryFn: async () => {
      const { data } = await api.GET('/api/households/{householdId}/tanks', {
        params: { path: { householdId: householdId ?? -1 } },
      });

      if (!data) {
        throw new Error('Tanks could not be loaded');
      }

      return data;
    },
  });
}

/** One tank; a 404 (deleted, or not this household's) comes back as `null`, not as an error. */
export function useTank (tankId: number): UseQueryResult<Tank | null> {
  return useQuery({
    queryKey: tankKey(tankId),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/tanks/{tankId}', { params: { path: { tankId } } });

      if (response.status === 404) {
        return null;
      }

      if (!data) {
        throw new Error('The tank could not be loaded');
      }

      return data;
    },
  });
}

export function useCreateTank (householdId: number): UseMutationResult<Tank, Error, Schemas['CreateTankDto']> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.POST('/api/households/{householdId}/tanks', {
        params: { path: { householdId } },
        body,
      });

      if (!data) {
        throw new Error('The tank could not be created');
      }

      return data;
    },
    onSuccess: (tank) => {
      queryClient.setQueryData(tankKey(tank.id), tank);

      return queryClient.invalidateQueries({ queryKey: tanksKey(householdId) });
    },
  });
}

export function useUpdateTank (tank: Pick<Tank, 'id' | 'householdId'>):
UseMutationResult<Tank, Error, Schemas['UpdateTankDto']> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data } = await api.PATCH('/api/tanks/{tankId}', {
        params: { path: { tankId: tank.id } },
        body,
      });

      if (!data) {
        throw new Error('The tank could not be updated');
      }

      return data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(tankKey(updated.id), updated);

      return queryClient.invalidateQueries({ queryKey: tanksKey(updated.householdId) });
    },
  });
}

export function useDeleteTank (tank: Pick<Tank, 'id' | 'householdId'>): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { response } = await api.DELETE('/api/tanks/{tankId}', { params: { path: { tankId: tank.id } } });

      if (!response.ok) {
        throw new Error('The tank could not be deleted');
      }
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: tankKey(tank.id) });

      return queryClient.invalidateQueries({ queryKey: tanksKey(tank.householdId) });
    },
  });
}

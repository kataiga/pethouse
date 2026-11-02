import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';

export type AnimalEntry = Schemas['TankAnimalResponseDto'];

export type PlantEntry = Schemas['TankPlantResponseDto'];

export type InhabitantKind = 'animals' | 'plants';

export type InhabitantEntry = AnimalEntry | PlantEntry;

/** Changes to one entry; `removedAt` set keeps it in the history, null puts it back. */
export type EntryChange = Schemas['UpdateTankAnimalDto'];

const inhabitantsKey = (tankId: number, kind: InhabitantKind): readonly unknown[] => ['tanks', tankId, kind];

export function useInhabitants (
  tankId: number,
  kind: InhabitantKind,
  includeRemoved: boolean,
): UseQueryResult<InhabitantEntry[]> {
  return useQuery({
    queryKey: [...inhabitantsKey(tankId, kind), { includeRemoved }],
    queryFn: async (): Promise<InhabitantEntry[]> => {
      const params = {
        path: { tankId },
        query: { includeRemoved },
      };
      const { data } = kind === 'animals'
        ? await api.GET('/api/tanks/{tankId}/animals', { params })
        : await api.GET('/api/tanks/{tankId}/plants', { params });

      if (!data) {
        throw new Error('Inhabitants could not be loaded');
      }

      return data;
    },
  });
}

export interface NewEntry {
  speciesId: number;
  quantity: number;
}

export function useAddInhabitant (tankId: number, kind: InhabitantKind): UseMutationResult<void, Error, NewEntry> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ speciesId, quantity }) => {
      const params = { path: { tankId } };
      const { response } = kind === 'animals'
        ? await api.POST('/api/tanks/{tankId}/animals', {
          params,
          body: {
            animalSpeciesId: speciesId,
            quantity,
          },
        })
        : await api.POST('/api/tanks/{tankId}/plants', {
          params,
          body: {
            plantSpeciesId: speciesId,
            quantity,
          },
        });

      if (!response.ok) {
        throw new Error('The inhabitant could not be added');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inhabitantsKey(tankId, kind) }),
  });
}

export interface EntryUpdate {
  entryId: number;
  change: EntryChange;
}

export function useUpdateInhabitant (tankId: number, kind: InhabitantKind):
UseMutationResult<void, Error, EntryUpdate> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, change }) => {
      const params = {
        path: {
          tankId,
          entryId,
        },
      };
      const { response } = kind === 'animals'
        ? await api.PATCH('/api/tanks/{tankId}/animals/{entryId}', {
          params,
          body: change,
        })
        : await api.PATCH('/api/tanks/{tankId}/plants/{entryId}', {
          params,
          body: change,
        });

      if (!response.ok) {
        throw new Error('The inhabitant could not be updated');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inhabitantsKey(tankId, kind) }),
  });
}

/** Deletes an entry outright: meant for mistakes, a removal date keeps the history. */
export function useDeleteInhabitant (tankId: number, kind: InhabitantKind): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId) => {
      const params = {
        path: {
          tankId,
          entryId,
        },
      };
      const { response } = kind === 'animals'
        ? await api.DELETE('/api/tanks/{tankId}/animals/{entryId}', { params })
        : await api.DELETE('/api/tanks/{tankId}/plants/{entryId}', { params });

      if (!response.ok) {
        throw new Error('The inhabitant could not be deleted');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inhabitantsKey(tankId, kind) }),
  });
}

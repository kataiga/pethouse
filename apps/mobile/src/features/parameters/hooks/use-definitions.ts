import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';
import { invalidateAllTankParameters } from './keys';
import { settingsKey } from './use-settings';

export type Definition = Schemas['ParameterDefinitionResponseDto'];

export const definitionsKey = ['parameter-definitions'] as const;

export function useDefinitions (): UseQueryResult<Definition[]> {
  return useQuery({
    queryKey: definitionsKey,
    queryFn: async () => {
      const { data } = await api.GET('/api/parameter-definitions');

      if (!data) {
        throw new Error('Parameter definitions could not be loaded');
      }

      return data;
    },
  });
}

export type DefinitionFailure = 'duplicate' | 'failed';

export class DefinitionError extends Error {
  constructor (readonly failure: DefinitionFailure) {
    super(failure);
  }
}

function refreshEverything (queryClient: ReturnType<typeof useQueryClient>): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: definitionsKey }),
    queryClient.invalidateQueries({ queryKey: settingsKey }),
    invalidateAllTankParameters(queryClient),
  ]);
}

/** A household's own parameter, offered on every tank type. */
export function useCreateDefinition (householdId: number):
UseMutationResult<Definition, DefinitionError, Schemas['CreateParameterDefinitionDto']> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data, response } = await api.POST('/api/households/{householdId}/parameter-definitions', {
        params: { path: { householdId } },
        body,
      });

      if (!data) {
        throw new DefinitionError(response.status === 409 ? 'duplicate' : 'failed');
      }

      return data;
    },
    onSuccess: () => refreshEverything(queryClient),
  });
}

/** Removes a household parameter with its settings, overrides and readings. */
export function useDeleteDefinition (householdId: number): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (definitionId) => {
      const { response } = await api.DELETE('/api/households/{householdId}/parameter-definitions/{definitionId}', {
        params: {
          path: {
            householdId,
            definitionId,
          },
        },
      });

      if (!response.ok) {
        throw new Error('The parameter could not be deleted');
      }
    },
    onSuccess: () => refreshEverything(queryClient),
  });
}

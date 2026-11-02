import {
  useMutation, UseMutationResult, useQueries, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';
import { isOutOfRange } from '../range';
import {
  historyKey, tankParametersKey,
} from './keys';

export type ResolvedParameter = Schemas['ResolvedParameterResponseDto'];

export type OverrideInput = Schemas['TankParameterOverrideInputDto'];

async function fetchTankParameters (tankId: number): Promise<ResolvedParameter[]> {
  const { data } = await api.GET('/api/tanks/{tankId}/parameters', { params: { path: { tankId } } });

  if (!data) {
    throw new Error('Tank parameters could not be loaded');
  }

  return [...data].sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Every parameter as it applies to the tank, enabled or not, in display order. */
export function useTankParameters (tankId: number): UseQueryResult<ResolvedParameter[]> {
  return useQuery({
    queryKey: tankParametersKey(tankId),
    queryFn: () => fetchTankParameters(tankId),
  });
}

/** A tracked parameter whose latest reading falls outside its thresholds. */
export function isAlerting (parameter: ResolvedParameter): boolean {
  return parameter.enabled && parameter.latest !== null
    && isOutOfRange(parameter.latest.value, parameter.minThreshold, parameter.maxThreshold);
}

/**
 * Tanks with an out-of-range latest reading, for the list badges. The state is derived on the
 * client from the resolved parameters, one request per tank, shared with each tank's detail.
 */
export function useAlertingTanks (tankIds: readonly number[]): ReadonlySet<number> {
  const results = useQueries({
    queries: tankIds.map((tankId) => ({
      queryKey: tankParametersKey(tankId),
      queryFn: () => fetchTankParameters(tankId),
    })),
  });

  return new Set(tankIds.filter((_tankId, index) => results[index]?.data?.some(isAlerting) ?? false));
}

export interface OverrideChange {
  definitionId: number;
  input: OverrideInput;
}

/** Makes the tank deviate from the account for one parameter; the API answers the new set. */
export function useOverrideParameter (tankId: number): UseMutationResult<ResolvedParameter[], Error, OverrideChange> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ definitionId, input }) => {
      const { data } = await api.PUT('/api/tanks/{tankId}/parameters/{definitionId}', {
        params: {
          path: {
            tankId,
            definitionId,
          },
        },
        body: input,
      });

      if (!data) {
        throw new Error('The parameter could not be changed for this tank');
      }

      return [...data].sort((a, b) => a.displayOrder - b.displayOrder);
    },
    onSuccess: (resolved) => {
      queryClient.setQueryData(tankParametersKey(tankId), resolved);

      return queryClient.invalidateQueries({ queryKey: historyKey(tankId) });
    },
  });
}

/** Drops the tank's deviation: the parameter follows the account setting again. */
export function useInheritParameter (tankId: number): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (definitionId) => {
      const { response } = await api.DELETE('/api/tanks/{tankId}/parameters/{definitionId}', {
        params: {
          path: {
            tankId,
            definitionId,
          },
        },
      });

      if (!response.ok) {
        throw new Error('The parameter could not be reset');
      }
    },
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: tankParametersKey(tankId) }),
      queryClient.invalidateQueries({ queryKey: historyKey(tankId) }),
    ]),
  });
}

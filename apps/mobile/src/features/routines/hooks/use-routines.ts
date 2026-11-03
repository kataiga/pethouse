import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';
import type {
  Routine, RoutineBody,
} from '../routine-form';
import {
  historyKey, routineKey, routinesKey,
} from './keys';

export type { Routine } from '../routine-form';

/** `rejected`: the API found the rule produces nothing from that start. */
export type RoutineFailure = 'rejected' | 'failed';

export class RoutineError extends Error {
  constructor (readonly failure: RoutineFailure) {
    super(failure);
  }
}

export function useRoutines (tankId: number): UseQueryResult<Routine[]> {
  return useQuery({
    queryKey: routinesKey(tankId),
    queryFn: async () => {
      const { data } = await api.GET('/api/tanks/{tankId}/routines', { params: { path: { tankId } } });

      if (!data) {
        throw new Error('Routines could not be loaded');
      }

      return data;
    },
  });
}

/** One routine; a 404 comes back as `null`, not as an error. */
export function useRoutine (tankId: number, routineId: number): UseQueryResult<Routine | null> {
  return useQuery({
    queryKey: routineKey(tankId, routineId),
    queryFn: async () => {
      const { data, response } = await api.GET('/api/tanks/{tankId}/routines/{routineId}', {
        params: {
          path: {
            tankId,
            routineId,
          },
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!data) {
        throw new Error('The routine could not be loaded');
      }

      return data;
    },
  });
}

function failureOf (status: number): RoutineError {
  return new RoutineError(status === 400 ? 'rejected' : 'failed');
}

export function useCreateRoutine (tankId: number): UseMutationResult<Routine, RoutineError, RoutineBody> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data, response } = await api.POST('/api/tanks/{tankId}/routines', {
        params: { path: { tankId } },
        body,
      });

      if (!data) {
        throw failureOf(response.status);
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: routinesKey(tankId) }),
  });
}

export function useUpdateRoutine (tankId: number, routineId: number):
UseMutationResult<Routine, RoutineError, Schemas['UpdateRoutineDto']> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      const { data, response } = await api.PATCH('/api/tanks/{tankId}/routines/{routineId}', {
        params: {
          path: {
            tankId,
            routineId,
          },
        },
        body,
      });

      if (!data) {
        throw failureOf(response.status);
      }

      return data;
    },
    onSuccess: (routine) => {
      queryClient.setQueryData(routineKey(tankId, routineId), routine);

      // A new rule, start or active flag re-plans the occurrences ahead.
      return queryClient.invalidateQueries({ queryKey: routinesKey(tankId) });
    },
  });
}

/** Deletes a routine with its whole history. */
export function useDeleteRoutine (tankId: number, routineId: number): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { response } = await api.DELETE('/api/tanks/{tankId}/routines/{routineId}', {
        params: {
          path: {
            tankId,
            routineId,
          },
        },
      });

      if (!response.ok) {
        throw new Error('The routine could not be deleted');
      }
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: routineKey(tankId, routineId) });

      return Promise.all([
        queryClient.invalidateQueries({ queryKey: routinesKey(tankId) }),
        queryClient.invalidateQueries({ queryKey: historyKey(tankId) }),
      ]);
    },
  });
}

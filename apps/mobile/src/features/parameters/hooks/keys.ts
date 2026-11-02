import type { QueryClient } from '@tanstack/react-query';

/** Everything parameter-related about one tank sits under the tank's key. */
export const tankParametersKey = (tankId: number): readonly unknown[] => ['tanks', tankId, 'parameters'];

export const measurementsKey = (tankId: number): readonly unknown[] => ['tanks', tankId, 'measurements'];

export const historyKey = (tankId: number): readonly unknown[] => ['tanks', tankId, 'history'];

/**
 * Account settings and definitions feed every tank's resolved parameters: after changing them,
 * every tank's parameters, readings and charts are stale.
 */
export function invalidateAllTankParameters (queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === 'tanks'
      && ['parameters', 'measurements', 'history'].some((part) => query.queryKey[2] === part),
  });
}

/** A reading changed: the tank's latest values, its reading lists and its charts. */
export function invalidateReadings (queryClient: QueryClient, tankId: number): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: tankParametersKey(tankId) }),
    queryClient.invalidateQueries({ queryKey: measurementsKey(tankId) }),
    queryClient.invalidateQueries({ queryKey: historyKey(tankId) }),
  ]);
}

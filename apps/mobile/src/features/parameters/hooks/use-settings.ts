import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import type { TankType } from '@/features/tanks/hooks/use-tanks';
import { api } from '@/lib/api/client';
import { invalidateAllTankParameters } from './keys';

export type Setting = Schemas['ParameterSettingResponseDto'];

export type SettingInput = Schemas['ParameterSettingInputDto'];

export const settingsKey = ['parameter-settings'] as const;

/** The caller's own settings for a tank type, seeded defaults merged in. */
export function useSettings (tankType: TankType): UseQueryResult<Setting[]> {
  return useQuery({
    queryKey: [...settingsKey, tankType],
    queryFn: async () => {
      const { data } = await api.GET('/api/users/me/parameter-settings/{tankType}', {
        params: { path: { tankType } },
      });

      if (!data) {
        throw new Error('Parameter settings could not be loaded');
      }

      return data;
    },
  });
}

export function useSaveSettings (tankType: TankType): UseMutationResult<Setting[], Error, SettingInput[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings) => {
      const { data } = await api.PUT('/api/users/me/parameter-settings/{tankType}', {
        params: { path: { tankType } },
        body: { settings },
      });

      if (!data) {
        throw new Error('Parameter settings could not be saved');
      }

      return data;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData([...settingsKey, tankType], saved);

      // Every tank of this type that never deviated follows the new setting.
      return invalidateAllTankParameters(queryClient);
    },
  });
}

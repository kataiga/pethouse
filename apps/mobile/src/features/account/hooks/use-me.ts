import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';

export type Me = Schemas['UserResponseDto'];

export const meKey = ['me'] as const;

export function useMe (): UseQueryResult<Me> {
  return useQuery({
    queryKey: meKey,
    queryFn: async () => {
      const { data } = await api.GET('/api/users/me');

      if (!data) {
        throw new Error('The account could not be loaded');
      }

      return data;
    },
  });
}

/** Name and language; the language also decides the text of push notifications. */
export function useUpdateMe (): UseMutationResult<Me, Error, Schemas['UpdateMeDto']> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes) => {
      const { data } = await api.PATCH('/api/users/me', { body: changes });

      if (!data) {
        throw new Error('The account could not be updated');
      }

      return data;
    },
    onSuccess: (me) => {
      queryClient.setQueryData(meKey, me);

      // The name shows on the member list.
      return queryClient.invalidateQueries({ queryKey: ['households'] });
    },
  });
}

import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';
import {
  type Household, householdsKey,
} from './use-households';

export type Invite = Schemas['InviteResponseDto'];

const invitesKey = (householdId: number): readonly unknown[] => ['households', householdId, 'invites'];

export function useInvites (householdId: number): UseQueryResult<Invite[]> {
  return useQuery({
    queryKey: invitesKey(householdId),
    queryFn: async () => {
      const { data } = await api.GET('/api/households/{householdId}/invites', { params: { path: { householdId } } });

      if (!data) {
        throw new Error('Invites could not be loaded');
      }

      return data;
    },
  });
}

/** One week, ten uses: the API's defaults, enough for a family. */
export function useCreateInvite (householdId: number): UseMutationResult<Invite, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.POST('/api/households/{householdId}/invites', {
        params: { path: { householdId } },
        body: {},
      });

      if (!data) {
        throw new Error('The invite could not be created');
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitesKey(householdId) }),
  });
}

export function useRevokeInvite (householdId: number): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId) => {
      const { response } = await api.DELETE('/api/households/{householdId}/invites/{inviteId}', {
        params: {
          path: {
            householdId,
            inviteId,
          },
        },
      });

      if (!response.ok) {
        throw new Error('The invite could not be revoked');
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitesKey(householdId) }),
  });
}

/** `invalid` covers unknown, expired, revoked and used-up codes: the API answers 404 for all. */
export type RedeemFailure = 'invalid' | 'failed';

export class RedeemError extends Error {
  constructor (readonly failure: RedeemFailure) {
    super(failure);
  }
}

interface RedeemResult {
  data?: Household;
  response: Response;
}

async function redeem (code: string): Promise<Household> {
  let result: RedeemResult;
  try {
    result = await api.POST('/api/invites/{code}/redeem', { params: { path: { code } } });
  } catch {
    throw new RedeemError('failed');
  }

  if (!result.data) {
    throw new RedeemError(result.response.status === 404 ? 'invalid' : 'failed');
  }

  return result.data;
}

export function useRedeemInvite (): UseMutationResult<Household, RedeemError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: redeem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdsKey }),
  });
}

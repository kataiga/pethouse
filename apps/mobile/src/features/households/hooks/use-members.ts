import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import type { Schemas } from '@pethouse/api-client';
import { api } from '@/lib/api/client';
import { householdsKey } from './use-households';

export type Member = Schemas['HouseholdMemberResponseDto'];

export type Role = Member['role'];

/** Why a membership change was refused, as keys under `household.errors`. */
export type MemberFailure = 'lastOwner' | 'forbidden' | 'failed';

export class MemberError extends Error {
  constructor (readonly failure: MemberFailure) {
    super(failure);
  }
}

function failureFor (status: number): MemberFailure {
  if (status === 409) {
    return 'lastOwner';
  }

  return status === 403 ? 'forbidden' : 'failed';
}

export const membersKey = (householdId: number): readonly unknown[] => ['households', householdId, 'members'];

export function useMembers (householdId: number): UseQueryResult<Member[]> {
  return useQuery({
    queryKey: membersKey(householdId),
    queryFn: async () => {
      const { data } = await api.GET('/api/households/{householdId}/members', { params: { path: { householdId } } });

      if (!data) {
        throw new Error('Members could not be loaded');
      }

      return data;
    },
  });
}

export interface RoleChange {
  userId: number;
  role: Role;
}

export function useChangeRole (householdId: number): UseMutationResult<void, MemberError, RoleChange> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }) => {
      const { response } = await api.PATCH('/api/households/{householdId}/members/{userId}', {
        params: {
          path: {
            householdId,
            userId,
          },
        },
        body: { role },
      });

      if (!response.ok) {
        throw new MemberError(failureFor(response.status));
      }
    },
    // Roles show on the member list and decide what the current person may do on every screen.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdsKey }),
  });
}

/** Removes someone, or leaves when `userId` is the current person. */
export function useRemoveMember (householdId: number): UseMutationResult<void, MemberError, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      const { response } = await api.DELETE('/api/households/{householdId}/members/{userId}', {
        params: {
          path: {
            householdId,
            userId,
          },
        },
      });

      if (!response.ok) {
        throw new MemberError(failureFor(response.status));
      }
    },
    // Leaving changes the current household and everything that hangs off it.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: householdsKey }),
  });
}

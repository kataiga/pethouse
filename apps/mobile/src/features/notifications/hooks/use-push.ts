import {
  useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult,
} from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { nativePushPlatform } from '@/lib/notifications/native-platform';
import {
  type PushRegistration, registerDevice,
} from '@/lib/notifications/registration';

export const pushKey = ['push-registration'] as const;

/**
 * This installation's registration, refreshed at each launch without asking anything: a token
 * that changed since is re-sent, a permission granted in the settings is picked up.
 */
export function usePushRegistration (): UseQueryResult<PushRegistration> {
  return useQuery({
    queryKey: pushKey,
    queryFn: () => registerDevice(api, nativePushPlatform, false),
    staleTime: Infinity,
    retry: false,
  });
}

/** Asks for the permission, from a tap of the person, and registers on success. */
export function useEnablePush (): UseMutationResult<PushRegistration, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => registerDevice(api, nativePushPlatform, true),
    onSuccess: (registration) => queryClient.setQueryData(pushKey, registration),
  });
}

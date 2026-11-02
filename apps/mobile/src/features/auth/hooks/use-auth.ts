import {
  useMutation, UseMutationResult, useQueryClient,
} from '@tanstack/react-query';
import { getCalendars } from 'expo-localization';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/lib/api/client';
import type { AuthResponse } from '../api/session';
import type {
  SignInFields, SignUpFields,
} from '../validation';
import { useSessionManager } from './session-context';

/** Keys under `auth.errors`: what went wrong, in words the person can act on. */
export type AuthFailure = 'invalidCredentials' | 'emailTaken' | 'rejected' | 'network';

export class AuthError extends Error {
  constructor (readonly failure: AuthFailure) {
    super(failure);
  }
}

function failureFor (status: number): AuthFailure {
  if (status === 401) {
    return 'invalidCredentials';
  }

  if (status === 409) {
    return 'emailTaken';
  }

  return status >= 500 ? 'network' : 'rejected';
}

async function call (request: () => Promise<{ data?: AuthResponse;
  response: Response }>): Promise<AuthResponse> {
  let result: { data?: AuthResponse;
    response: Response };
  try {
    result = await request();
  } catch {
    throw new AuthError('network');
  }

  if (!result.data) {
    throw new AuthError(failureFor(result.response.status));
  }

  return result.data;
}

function deviceTimeZone (): string {
  return getCalendars()[0]?.timeZone ?? 'Europe/Paris';
}

export function useSignIn (): UseMutationResult<void, AuthError, SignInFields> {
  const session = useSessionManager();

  return useMutation({
    mutationFn: async (fields) => {
      const response = await call(() => authApi.POST('/api/auth/login', {
        body: {
          email: fields.email.trim(),
          password: fields.password,
        },
      }));
      await session.signIn(response);
    },
  });
}

/** Creates the account in the current UI language and the device's time zone. */
export function useSignUp (): UseMutationResult<void, AuthError, SignUpFields> {
  const session = useSessionManager();
  const { i18n } = useTranslation();

  return useMutation({
    mutationFn: async (fields) => {
      const response = await call(() => authApi.POST('/api/auth/register', {
        body: {
          email: fields.email.trim(),
          password: fields.password,
          displayName: fields.displayName.trim(),
          preferredLanguage: i18n.language === 'en' ? 'en' : 'fr',
          timezone: deviceTimeZone(),
        },
      }));
      await session.signIn(response);
    },
  });
}

/** Signs out and drops every cached query: nothing of this account stays on screen. */
export function useSignOut (): UseMutationResult<void, Error, void> {
  const session = useSessionManager();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await session.signOut();
      queryClient.clear();
    },
  });
}

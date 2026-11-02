import {
  Redirect, Stack, useGlobalSearchParams,
} from 'expo-router';
import { SessionLoadingScreen } from '@/features/auth/components/session-loading-screen';
import { useSession } from '@/features/auth/hooks/session-context';
import { safeNextRoute } from '@/features/auth/next-route';

/** Sign-in and sign-up; a signed-in person goes on to `next`, or to the start. */
export default function PublicLayout (): React.JSX.Element {
  const state = useSession();
  const { next } = useGlobalSearchParams<{ next?: string }>();

  if (state.status === 'restoring') {
    return <SessionLoadingScreen />;
  }

  if (state.status === 'signedIn') {
    return <Redirect href={safeNextRoute(next)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

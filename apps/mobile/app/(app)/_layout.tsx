import {
  Redirect, Stack,
} from 'expo-router';
import { SessionLoadingScreen } from '@/features/auth/components/session-loading-screen';
import { UnreachableScreen } from '@/features/auth/components/unreachable-screen';
import { useSession } from '@/features/auth/hooks/session-context';

/** Everything behind sign-in. Deep links land here and wait for the session to resume. */
export default function AppLayout (): React.JSX.Element {
  const state = useSession();

  switch (state.status) {
    case 'restoring':
      return <SessionLoadingScreen />;
    case 'unreachable':
      return <UnreachableScreen />;
    case 'signedOut':
      return <Redirect href="/sign-in" />;
    case 'signedIn':
      return <Stack screenOptions={{ headerShown: false }} />;
  }
}

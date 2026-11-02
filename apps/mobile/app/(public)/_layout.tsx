import {
  Redirect, Stack,
} from 'expo-router';
import { SessionLoadingScreen } from '@/features/auth/components/session-loading-screen';
import { useSession } from '@/features/auth/hooks/session-context';

/** Sign-in and sign-up; a signed-in person goes straight to the app. */
export default function PublicLayout (): React.JSX.Element {
  const state = useSession();

  if (state.status === 'restoring') {
    return <SessionLoadingScreen />;
  }

  if (state.status === 'signedIn') {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

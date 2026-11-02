// One import per weight: the package index would bundle all eighteen faces.
import { Figtree_400Regular } from '@expo-google-fonts/figtree/400Regular';
import { Figtree_500Medium } from '@expo-google-fonts/figtree/500Medium';
import { Figtree_600SemiBold } from '@expo-google-fonts/figtree/600SemiBold';
import { Figtree_700Bold } from '@expo-google-fonts/figtree/700Bold';
import { Figtree_800ExtraBold } from '@expo-google-fonts/figtree/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppProviders } from '@/app-providers';
import { UnreachableScreen } from '@/features/auth/components/unreachable-screen';
import { useSession } from '@/features/auth/hooks/session-context';
import { useTheme } from '@/theme';

void SplashScreen.preventAutoHideAsync();

/**
 * Keeps the native splash screen up until the session has resumed, so the first routed screen
 * already knows whether the person is signed in: a deep link opened at launch then reaches its
 * route, or travels through sign-in with its path intact, without a flash of a loading screen.
 * `restoring` and `unreachable` only happen at launch, so both are handled here, before any
 * navigator mounts: swapping a nested navigator out and back in confuses react-navigation.
 */
function AppShell (): React.JSX.Element | null {
  const { scheme, colors } = useTheme();
  const session = useSession();
  const restoring = session.status === 'restoring';

  useEffect(() => {
    if (!restoring) {
      void SplashScreen.hideAsync();
    }
  }, [restoring]);

  if (restoring) {
    return null;
  }

  if (session.status === 'unreachable') {
    return <UnreachableScreen />;
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}

export default function RootLayout (): React.JSX.Element | null {
  const [loaded, error] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const ready = loaded || error !== null;

  // The splash screen stays until AppShell has a session to show.
  if (!ready) {
    return null;
  }

  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}

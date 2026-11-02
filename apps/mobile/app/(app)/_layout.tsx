import {
  Redirect, Stack, usePathname,
} from 'expo-router';
import { SessionLoadingScreen } from '@/features/auth/components/session-loading-screen';
import { UnreachableScreen } from '@/features/auth/components/unreachable-screen';
import { useSession } from '@/features/auth/hooks/session-context';
import {
  fonts, useTheme,
} from '@/theme';

/**
 * Everything behind sign-in. A deep link opened while signed out goes through sign-in and comes
 * back here: the path travels as `next`.
 */
export default function AppLayout (): React.JSX.Element {
  const state = useSession();
  const pathname = usePathname();
  const { colors } = useTheme();

  switch (state.status) {
    case 'restoring':
      return <SessionLoadingScreen />;
    case 'unreachable':
      return <UnreachableScreen />;
    case 'signedOut':
      return (
        <Redirect href={pathname === '/' ? '/sign-in' : `/sign-in?next=${encodeURIComponent(pathname)}`} />
      );
    case 'signedIn':
      return (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.ink,
            headerTitleStyle: { fontFamily: fonts.bold },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      );
  }
}

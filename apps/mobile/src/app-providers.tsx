import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@/features/auth/api/session';
import { SessionProvider } from '@/features/auth/hooks/session-context';
import { session as appSession } from '@/lib/api/client';
import { createQueryClient } from '@/lib/api/query-client';
import { i18n } from '@/lib/i18n';
import {
  type ColorScheme, ThemeProvider,
} from '@/theme';

/** Everything a screen needs around it; tests render screens inside it too. */
export function AppProviders ({
  children,
  initialScheme,
  session = appSession,
}: {
  children: React.ReactNode;
  initialScheme?: ColorScheme;
  session?: Session;
}): React.JSX.Element {
  const [queryClient] = useState(createQueryClient);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider initialScheme={initialScheme}>
          <SessionProvider session={session}>
            <SafeAreaProvider>{children}</SafeAreaProvider>
          </SessionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

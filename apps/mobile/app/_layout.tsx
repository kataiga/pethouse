import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '@/app-providers';

export default function RootLayout (): React.JSX.Element {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}

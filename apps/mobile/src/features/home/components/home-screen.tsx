import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { useSignOut } from '@/features/auth/hooks/use-auth';
import { useSession } from '@/features/auth/hooks/session-context';
import { useHouseholds } from '@/features/households/hooks/use-households';
import {
  space, useTheme,
} from '@/theme';

/** Signed-in landing until the feature screens arrive: who you are and your households. */
export function HomeScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const state = useSession();
  const households = useHouseholds();
  const signOut = useSignOut();
  const name = state.status === 'signedIn' ? state.user.displayName : '';

  return (
    <Screen testID="home-screen">
      <View style={styles.header}>
        <AppText tone="lagon" variant="label">{t('home.eyebrow')}</AppText>
        <AppText accessibilityRole="header" variant="display">{t('home.greeting', { name })}</AppText>
      </View>

      <Surface testID="households">
        <AppText tone="soft" variant="label">{t('home.households.title')}</AppText>
        {households.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
        {households.isError ? (
          <>
            <AppText tone="ambre">{t('home.households.error')}</AppText>
            <Button label={t('common.retry')} onPress={() => void households.refetch()} variant="soft" />
          </>
        ) : null}
        {households.data?.length === 0 ? <AppText tone="soft">{t('home.households.empty')}</AppText> : null}
        {households.data?.map((household) => (
          <View key={household.id} style={styles.household}>
            <AppText variant="heading">{household.name}</AppText>
            <AppText tone="soft" variant="caption">{household.timezone}</AppText>
          </View>
        ))}
      </Surface>

      <Button
        label={t('home.signOut')}
        loading={signOut.isPending}
        onPress={() => signOut.mutate()}
        testID="sign-out"
        variant="soft"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: space.sm },
  household: { gap: 2 },
});

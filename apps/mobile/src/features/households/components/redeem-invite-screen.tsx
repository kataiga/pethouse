import {
  router, Stack, useLocalSearchParams,
} from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { space } from '@/theme';
import { useRedeemInvite } from '../hooks/use-invites';

/** Where `pethouse://invite/<code>` lands: nothing happens until the person confirms. */
export function RedeemInviteScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const redeem = useRedeemInvite();

  return (
    <Screen style={styles.screen} testID="redeem-screen">
      <Stack.Screen options={{ title: t('household.redeem.title') }} />
      <AppText accessibilityRole="header" variant="title">{t('household.redeem.heading')}</AppText>
      <Surface>
        <AppText tone="soft" variant="label">{t('household.redeem.code')}</AppText>
        <AppText selectable variant="heading">{code}</AppText>
      </Surface>
      <AppText tone="soft">{t('household.redeem.explain')}</AppText>
      {redeem.error ? <Pill label={t(`household.redeem.errors.${redeem.error.failure}`)} tone="late" /> : null}
      <Button
        label={t('household.redeem.submit')}
        loading={redeem.isPending}
        onPress={() => redeem.mutate(code, { onSuccess: () => router.replace('/household') })}
        testID="redeem-submit"
      />
      <Button label={t('common.cancel')} onPress={() => router.replace('/')} variant="soft" />
    </Screen>
  );
}

const styles = StyleSheet.create({ screen: { gap: space.lg } });

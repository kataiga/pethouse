import { useTranslation } from 'react-i18next';
import {
  StyleSheet, View, 
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { useSession } from '@/features/auth/hooks/session-context';
import { space } from '@/theme';

/** Upcoming and overdue tasks land here with the routines; for now, a greeting. */
export function TodayScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const state = useSession();
  const name = state.status === 'signedIn' ? state.user.displayName : '';

  return (
    <Screen testID="today-screen">
      <View style={styles.header}>
        <AppText tone="lagon" variant="label">{t('today.eyebrow')}</AppText>
        <AppText accessibilityRole="header" variant="display">{t('home.greeting', { name })}</AppText>
      </View>
      <Surface>
        <AppText tone="soft">{t('today.soon')}</AppText>
      </Surface>
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: space.sm } });

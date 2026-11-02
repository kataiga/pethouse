import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/theme';

export function SessionLoadingScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Screen style={styles.screen} testID="session-loading">
      <ActivityIndicator color={colors.lagon} size="large" />
      <AppText tone="soft">{t('session.loading')}</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

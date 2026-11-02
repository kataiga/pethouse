import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useSessionManager } from '../hooks/session-context';

/** Launch without a network: the session is intact, only the server is out of reach. */
export function UnreachableScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const session = useSessionManager();

  return (
    <Screen style={styles.screen} testID="unreachable-screen">
      <AppText accessibilityRole="header" variant="title">{t('session.unreachable.title')}</AppText>
      <AppText tone="soft">{t('session.unreachable.body')}</AppText>
      <Button label={t('common.retry')} onPress={() => void session.restore()} testID="unreachable-retry" />
    </Screen>
  );
}

const styles = StyleSheet.create({ screen: { justifyContent: 'center' } });

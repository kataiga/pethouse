import { useState } from 'react';
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
  const [retrying, setRetrying] = useState(false);

  const retry = async (): Promise<void> => {
    setRetrying(true);
    try {
      await session.restore();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Screen style={styles.screen} testID="unreachable-screen">
      <AppText accessibilityRole="header" variant="title">{t('session.unreachable.title')}</AppText>
      <AppText tone="soft">{t('session.unreachable.body')}</AppText>
      <Button label={t('common.retry')} loading={retrying} onPress={() => void retry()} testID="unreachable-retry" />
    </Screen>
  );
}

const styles = StyleSheet.create({ screen: { justifyContent: 'center' } });

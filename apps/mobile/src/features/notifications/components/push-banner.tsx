import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import {
  useEnablePush, usePushRegistration,
} from '../hooks/use-push';

/** On the Today tab while reminders cannot reach this phone and the person can change that. */
export function PushBanner (): React.JSX.Element | null {
  const { t } = useTranslation();
  const registration = usePushRegistration();
  const enable = useEnablePush();
  const status = registration.data?.status;

  if (status === 'undetermined') {
    return (
      <Surface testID="push-banner">
        <AppText>{t('notifications.banner.undetermined')}</AppText>
        <Button
          label={t('notifications.banner.enable')}
          loading={enable.isPending}
          onPress={() => enable.mutate()}
          testID="push-enable"
        />
      </Surface>
    );
  }

  if (status === 'denied') {
    return (
      <Surface testID="push-banner">
        <AppText tone="ambre">{t('notifications.banner.denied')}</AppText>
        <Button
          label={t('notifications.banner.openSettings')}
          onPress={() => void Linking.openSettings()}
          testID="push-settings"
          variant="soft"
        />
      </Surface>
    );
  }

  return null;
}

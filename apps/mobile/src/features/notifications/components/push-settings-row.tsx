import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Linking,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { useTheme } from '@/theme';
import {
  pushKey, useEnablePush, usePushRegistration,
} from '../hooks/use-push';

/** Where notifications stand on this phone, with the one thing the person can do about it. */
export function PushSettingsRow (): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const registration = usePushRegistration();
  const enable = useEnablePush();
  const status = registration.data?.status;

  return (
    <Surface testID="push-settings-row">
      <AppText tone="soft" variant="label">{t('notifications.account.title')}</AppText>
      {registration.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
      {status ? (
        <AppText testID="push-status" tone={status === 'granted' ? 'mousse' : 'soft'}>
          {t(`notifications.account.${status}`)}
        </AppText>
      ) : null}
      {status === 'undetermined' ? (
        <Button
          label={t('notifications.banner.enable')}
          loading={enable.isPending}
          onPress={() => enable.mutate()}
          testID="push-settings-enable"
          variant="soft"
        />
      ) : null}
      {status === 'denied' ? (
        <Button
          label={t('notifications.banner.openSettings')}
          onPress={() => void Linking.openSettings()}
          variant="soft"
        />
      ) : null}
      {status === 'failed' || registration.isError ? (
        <Button
          label={t('notifications.account.retry')}
          onPress={() => void queryClient.invalidateQueries({ queryKey: pushKey })}
          variant="soft"
        />
      ) : null}
    </Surface>
  );
}

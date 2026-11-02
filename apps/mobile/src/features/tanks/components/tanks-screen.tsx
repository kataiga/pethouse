import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';

/** The tank list arrives with the next feature pull request. */
export function TanksScreen (): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Screen testID="tanks-screen">
      <AppText accessibilityRole="header" variant="display">{t('tanks.title')}</AppText>
      <Surface>
        <AppText tone="soft">{t('tanks.soon')}</AppText>
      </Surface>
    </Screen>
  );
}

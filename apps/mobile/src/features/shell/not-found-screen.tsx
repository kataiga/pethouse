import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/app-text';
import { Screen } from '@/components/ui/screen';

export function NotFoundScreen (): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Screen style={{ justifyContent: 'center' }}>
      <AppText accessibilityRole="header" variant="title">{t('notFound.title')}</AppText>
      <Link href="/">
        <AppText tone="lagon" variant="strong">{t('notFound.back')}</AppText>
      </Link>
    </Screen>
  );
}

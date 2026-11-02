import { useTranslation } from 'react-i18next';
import {
  StyleSheet, View, 
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { space } from '@/theme';

export function AuthHeader ({ title }: { title: string }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <AppText tone="lagon" variant="label">{t('welcome.eyebrow')}</AppText>
      <AppText accessibilityRole="header" variant="display">{title}</AppText>
      <AppText tone="soft">{t('welcome.tagline')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({ header: { gap: space.sm } });

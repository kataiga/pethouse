import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet, Text, View,
} from 'react-native';

export function NotFoundScreen (): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>{t('notFound.title')}</Text>
      <Link href="/">{t('notFound.back')}</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
});

import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApiHealth } from '@/lib/api/use-api-health';
import {
  type AppLanguage, changeLanguage, SUPPORTED_LANGUAGES,
} from '@/lib/i18n';

/**
 * Scaffold landing screen: proves translation, the language switch and the generated client end
 * to end. It becomes the sign-in entry once the auth flow lands; styling waits for the design
 * tokens.
 */
export function WelcomeScreen (): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const health = useApiHealth();

  return (
    <SafeAreaView style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>{t('welcome.title')}</Text>
      <Text style={styles.tagline}>{t('welcome.tagline')}</Text>

      <View style={styles.status} testID="api-status">
        {health.isPending ? (
          <>
            <ActivityIndicator />
            <Text>{t('welcome.api.checking')}</Text>
          </>
        ) : null}
        {health.isError ? (
          <>
            <Text>{t('welcome.api.down')}</Text>
            <Pressable accessibilityRole="button" onPress={() => void health.refetch()}>
              <Text>{t('common.retry')}</Text>
            </Pressable>
          </>
        ) : null}
        {health.data ? (
          <Text>{health.data.status === 'ok' ? t('welcome.api.ok') : t('welcome.api.degraded')}</Text>
        ) : null}
      </View>

      <View accessibilityLabel={t('language.label')} style={styles.languages}>
        {SUPPORTED_LANGUAGES.map((language: AppLanguage) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: i18n.language === language }}
            key={language}
            onPress={() => void changeLanguage(language)}
            testID={`language-${language}`}
          >
            <Text style={i18n.language === language ? styles.selected : undefined}>{t(`language.${language}`)}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
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
    fontSize: 32,
    fontWeight: '700',
  },
  tagline: { fontSize: 16 },
  status: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  languages: {
    flexDirection: 'row',
    gap: 16,
  },
  selected: { fontWeight: '700' },
});

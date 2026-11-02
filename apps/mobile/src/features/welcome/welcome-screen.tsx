import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Surface } from '@/components/ui/surface';
import { useApiHealth } from '@/lib/api/use-api-health';
import {
  type AppLanguage, changeLanguage, SUPPORTED_LANGUAGES,
} from '@/lib/i18n';
import {
  type ColorScheme, space, useTheme,
} from '@/theme';

const SCHEMES: readonly ColorScheme[] = ['dark', 'light'];

/**
 * Landing screen until the auth flow lands: translation, the language and theme switches, and the
 * generated client end to end, with the server state in plain sight.
 */
export function WelcomeScreen (): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { scheme, setScheme, colors } = useTheme();
  const health = useApiHealth();

  return (
    <Screen style={styles.screen} testID="welcome-screen">
      <View style={styles.hero}>
        <AppText tone="lagon" variant="label">{t('welcome.eyebrow')}</AppText>
        <AppText accessibilityRole="header" variant="display">{t('welcome.title')}</AppText>
        <AppText tone="soft">{t('welcome.tagline')}</AppText>
      </View>

      <Surface testID="api-status">
        <AppText tone="soft" variant="label">{t('welcome.api.label')}</AppText>
        {health.isPending ? (
          <View style={styles.row}>
            <ActivityIndicator color={colors.lagon} />
            <AppText tone="soft">{t('welcome.api.checking')}</AppText>
          </View>
        ) : null}
        {health.isError ? (
          <>
            <Pill label={t('welcome.api.down')} tone="late" />
            <Button label={t('common.retry')} onPress={() => void health.refetch()} variant="soft" />
          </>
        ) : null}
        {health.data ? (
          <Pill
            label={health.data.status === 'ok' ? t('welcome.api.ok') : t('welcome.api.degraded')}
            tone={health.data.status === 'ok' ? 'done' : 'late'}
          />
        ) : null}
      </Surface>

      <SegmentedControl<AppLanguage>
        label={t('language.label')}
        onChange={(language) => void changeLanguage(language)}
        options={SUPPORTED_LANGUAGES.map((language) => ({
          value: language,
          label: t(`language.${language}`),
        }))}
        testID="language"
        value={i18n.language === 'en' ? 'en' : 'fr'}
      />
      <SegmentedControl<ColorScheme>
        label={t('theme.label')}
        onChange={setScheme}
        options={SCHEMES.map((option) => ({
          value: option,
          label: t(`theme.${option}`),
        }))}
        testID="theme"
        value={scheme}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center' },
  hero: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
});

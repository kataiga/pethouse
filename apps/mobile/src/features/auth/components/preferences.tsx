import { useTranslation } from 'react-i18next';
import {
  StyleSheet, View, 
} from 'react-native';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  type AppLanguage, changeLanguage, SUPPORTED_LANGUAGES,
} from '@/lib/i18n';
import {
  type ColorScheme, space, useTheme,
} from '@/theme';

const SCHEMES: readonly ColorScheme[] = ['dark', 'light'];

/** Language and day/night, reachable before signing in. */
export function Preferences (): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { scheme, setScheme } = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.cell}>
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
      </View>
      <View style={styles.cell}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  cell: {
    flexGrow: 1,
    flexBasis: 140,
  },
});

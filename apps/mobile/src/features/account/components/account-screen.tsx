import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, ScrollView, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { useSignOut } from '@/features/auth/hooks/use-auth';
import { DISPLAY_NAME_MAX_LENGTH } from '@/features/auth/validation';
import {
  type AppLanguage, changeLanguage, SUPPORTED_LANGUAGES,
} from '@/lib/i18n';
import {
  type ColorScheme, space, useTheme,
} from '@/theme';
import {
  type Me, useMe, useUpdateMe,
} from '../hooks/use-me';

const SCHEMES: readonly ColorScheme[] = ['dark', 'light'];

function Profile ({ me }: { me: Me }): React.JSX.Element {
  const { t } = useTranslation();
  const update = useUpdateMe();
  const [name, setName] = useState(me.displayName);
  const trimmed = name.trim();
  const changed = trimmed !== me.displayName;

  return (
    <Surface>
      <TextField
        error={trimmed.length === 0 ? t('auth.errors.displayNameRequired') : undefined}
        label={t('auth.fields.displayName')}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        onChangeText={setName}
        testID="account-name"
        value={name}
      />
      <AppText tone="soft" variant="caption">{me.email}</AppText>
      {update.isError ? <Pill label={t('account.saveFailed')} tone="late" /> : null}
      {changed ? (
        <Button
          disabled={trimmed.length === 0}
          label={t('common.save')}
          loading={update.isPending}
          onPress={() => update.mutate({ displayName: trimmed })}
          testID="account-name-save"
        />
      ) : null}
    </Surface>
  );
}

/** Who you are, how the app speaks and looks, and the way out. */
export function AccountScreen (): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors, scheme, setScheme } = useTheme();
  const me = useMe();
  const update = useUpdateMe();
  const signOut = useSignOut();

  // The language is also the language of push notifications, so the account keeps it.
  const chooseLanguage = (language: AppLanguage): void => {
    void changeLanguage(language);
    update.mutate({ preferredLanguage: language });
  };

  return (
    <Screen testID="account-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <AppText accessibilityRole="header" variant="display">{t('account.title')}</AppText>
        {me.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
        {me.isError ? (
          <Surface>
            <AppText tone="ambre">{t('account.error')}</AppText>
            <Button label={t('common.retry')} onPress={() => void me.refetch()} variant="soft" />
          </Surface>
        ) : null}
        {me.data ? <Profile key={me.data.displayName} me={me.data} /> : null}
        <View style={styles.block}>
          <SegmentedControl<AppLanguage>
            label={t('language.label')}
            onChange={chooseLanguage}
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
        </View>
        <Button
          label={t('home.signOut')}
          loading={signOut.isPending}
          onPress={() => signOut.mutate()}
          testID="sign-out"
          variant="soft"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  block: { gap: space.md },
});

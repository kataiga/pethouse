import {
  router, Stack,
} from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { space } from '@/theme';
import { inviteCodeFrom } from '../invite-code';

/** For a code read aloud or a link pasted from another app. */
export function JoinScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);

  const submit = (): void => {
    const code = inviteCodeFrom(input);
    setInvalid(code === null);

    if (code !== null) {
      router.push(`/invite/${code}`);
    }
  };

  return (
    <Screen style={styles.screen} testID="join-screen">
      <Stack.Screen options={{ title: t('household.join.title') }} />
      <AppText tone="soft">{t('household.join.explain')}</AppText>
      <TextField
        autoCapitalize="none"
        autoCorrect={false}
        error={invalid ? t('household.join.invalid') : undefined}
        label={t('household.join.label')}
        onChangeText={setInput}
        onSubmitEditing={submit}
        testID="join-code"
        value={input}
      />
      <Button label={t('household.join.submit')} onPress={submit} testID="join-submit" />
    </Screen>
  );
}

const styles = StyleSheet.create({ screen: { gap: space.lg } });

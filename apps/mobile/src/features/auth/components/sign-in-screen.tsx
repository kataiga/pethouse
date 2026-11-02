import { Link } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { space } from '@/theme';
import { useSignIn } from '../hooks/use-auth';
import {
  type FieldErrors, hasErrors, type SignInFields, validateSignIn,
} from '../validation';
import { AuthHeader } from './auth-header';
import { FormError } from './form-error';
import { Preferences } from './preferences';

export function SignInScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const signIn = useSignIn();
  const [fields, setFields] = useState<SignInFields>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FieldErrors<SignInFields>>({});

  const submit = (): void => {
    const found = validateSignIn(fields);
    setErrors(found);

    if (!hasErrors(found)) {
      signIn.mutate(fields);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AuthHeader title={t('auth.signIn.title')} />
          <TextField
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email ? t(`auth.errors.${errors.email}`) : undefined}
            inputMode="email"
            label={t('auth.fields.email')}
            onChangeText={(email) => setFields({
              ...fields,
              email,
            })}
            testID="sign-in-email"
            value={fields.email}
          />
          <TextField
            autoComplete="current-password"
            error={errors.password ? t(`auth.errors.${errors.password}`) : undefined}
            label={t('auth.fields.password')}
            onChangeText={(password) => setFields({
              ...fields,
              password,
            })}
            onSubmitEditing={submit}
            secureTextEntry
            testID="sign-in-password"
            value={fields.password}
          />
          <FormError error={signIn.error} />
          <Button label={t('auth.signIn.submit')} loading={signIn.isPending} onPress={submit} testID="sign-in-submit" />
          <Link href="/sign-up" replace>
            <AppText tone="lagon" variant="strong">{t('auth.signIn.toSignUp')}</AppText>
          </Link>
          <Preferences />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
});

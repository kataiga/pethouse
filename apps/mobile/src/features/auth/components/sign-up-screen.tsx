import {
  Link, useLocalSearchParams,
} from 'expo-router';
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
import { useSignUp } from '../hooks/use-auth';
import {
  type FieldErrors, hasErrors, PASSWORD_MIN_LENGTH, type SignUpFields, validateSignUp,
} from '../validation';
import { AuthHeader } from './auth-header';
import { FormError } from './form-error';
import { Preferences } from './preferences';

export function SignUpScreen (): React.JSX.Element {
  const { t } = useTranslation();
  // Carried across sign-in and sign-up so a deep link survives either path.
  const { next } = useLocalSearchParams<{ next?: string }>();
  const signUp = useSignUp();
  const [fields, setFields] = useState<SignUpFields>({
    displayName: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<FieldErrors<SignUpFields>>({});

  const submit = (): void => {
    const found = validateSignUp(fields);
    setErrors(found);

    if (!hasErrors(found)) {
      signUp.mutate(fields);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AuthHeader title={t('auth.signUp.title')} />
          <TextField
            autoComplete="name"
            error={errors.displayName ? t(`auth.errors.${errors.displayName}`) : undefined}
            label={t('auth.fields.displayName')}
            onChangeText={(displayName) => setFields({
              ...fields,
              displayName,
            })}
            testID="sign-up-name"
            value={fields.displayName}
          />
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
            testID="sign-up-email"
            value={fields.email}
          />
          <TextField
            autoComplete="new-password"
            error={errors.password
              ? t(`auth.errors.${errors.password}`, { count: PASSWORD_MIN_LENGTH })
              : undefined}
            label={t('auth.fields.password')}
            onChangeText={(password) => setFields({
              ...fields,
              password,
            })}
            onSubmitEditing={submit}
            secureTextEntry
            testID="sign-up-password"
            value={fields.password}
          />
          <FormError error={signUp.error} />
          <Button label={t('auth.signUp.submit')} loading={signUp.isPending} onPress={submit} testID="sign-up-submit" />
          <Link
            href={next ? {
              pathname: '/sign-in',
              params: { next },
            } : '/sign-in'}
            replace
          >
            <AppText tone="lagon" variant="strong">{t('auth.signUp.toSignIn')}</AppText>
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

import {
  router, Stack,
} from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import {
  space, useTheme,
} from '@/theme';
import {
  type Tank, useTank, useUpdateTank,
} from '../hooks/use-tanks';
import {
  type TankFormErrors, type TankFormValues, validateTankForm, valuesFromTank,
} from '../tank-form';
import { SubtypePicker } from './subtype-picker';
import { TankDetailsForm } from './tank-details-form';

function EditForm ({ tank }: { tank: Tank }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const update = useUpdateTank(tank);
  const [values, setValues] = useState<TankFormValues>(() => valuesFromTank(tank, i18n.language));
  const [errors, setErrors] = useState<TankFormErrors>({});

  const save = (): void => {
    const result = validateTankForm(values);

    if (!result.ok) {
      setErrors(result.errors);

      return;
    }
    setErrors({});
    // Every field is sent: a null clears what the person emptied.
    update.mutate(result.fields, { onSuccess: () => router.back() });
  };

  return (
    <>
      <AppText tone="soft" variant="label">{t('tanks.edit.subtype')}</AppText>
      <SubtypePicker
        householdId={tank.householdId}
        onChange={(subtypeId) => setValues({
          ...values,
          subtypeId,
        })}
        tankType={tank.tankType}
        value={values.subtypeId}
      />
      <TankDetailsForm errors={errors} onChange={setValues} values={values} />
      {update.isError ? <AppText tone="ambre">{t('tanks.form.failed')}</AppText> : null}
      <View style={styles.actions}>
        <Button label={t('common.cancel')} onPress={() => router.back()} variant="soft" />
        <Button label={t('common.save')} loading={update.isPending} onPress={save} testID="tank-edit-save" />
      </View>
    </>
  );
}

/** Everything about a tank but its type, which is fixed once created. */
export function EditTankScreen ({ tankId }: { tankId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tank = useTank(tankId);

  return (
    <Screen testID="edit-tank-screen">
      <Stack.Screen options={{ title: t('tanks.edit.title') }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {tank.isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
          {tank.isError ? (
            <Surface>
              <AppText tone="ambre">{t('tanks.detail.error')}</AppText>
              <Button label={t('common.retry')} onPress={() => void tank.refetch()} variant="soft" />
            </Surface>
          ) : null}
          {tank.data === null ? (
            <Surface>
              <AppText>{t('tanks.detail.notFound')}</AppText>
            </Surface>
          ) : null}
          {tank.data ? <EditForm tank={tank.data} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    gap: space.lg,
    paddingBottom: space.xxl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
  },
});

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
import { useCurrentHousehold } from '@/features/households/hooks/use-households';
import {
  space, useTheme,
} from '@/theme';
import {
  type TankType, useCreateTank,
} from '../hooks/use-tanks';
import {
  createBody, EMPTY_TANK_FORM, type TankFormErrors, type TankFormValues, validateTankForm,
} from '../tank-form';
import { SubtypePicker } from './subtype-picker';
import { TankDetailsForm } from './tank-details-form';
import { TypeStep } from './type-step';

type Step = 'type' | 'subtype' | 'details';

const STEPS: readonly Step[] = ['type', 'subtype', 'details'];

function Wizard ({ householdId }: { householdId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const create = useCreateTank(householdId);
  const [step, setStep] = useState<Step>('type');
  const [tankType, setTankType] = useState<TankType | null>(null);
  const [values, setValues] = useState<TankFormValues>(EMPTY_TANK_FORM);
  const [errors, setErrors] = useState<TankFormErrors>({});
  const index = STEPS.indexOf(step);

  const submit = (type: TankType): void => {
    const result = validateTankForm(values);

    if (!result.ok) {
      setErrors(result.errors);

      return;
    }
    setErrors({});
    create.mutate(createBody(type, result.fields), { onSuccess: (tank) => router.replace(`/tanks/${tank.id}`) });
  };

  return (
    <>
      <AppText tone="lagon" variant="label">{t('tanks.create.step', {
        current: index + 1,
        total: STEPS.length,
      })}</AppText>
      {step === 'type' ? (
        <>
          <AppText accessibilityRole="header" variant="title">{t('tanks.create.typeTitle')}</AppText>
          <TypeStep
            onSelect={(selected) => {
              if (selected !== tankType) {
                setValues({
                  ...values,
                  subtypeId: null,
                });
              }
              setTankType(selected);
              setStep('subtype');
            }}
            value={tankType}
          />
        </>
      ) : null}
      {step === 'subtype' && tankType !== null ? (
        <>
          <AppText accessibilityRole="header" variant="title">{t('tanks.create.subtypeTitle')}</AppText>
          <AppText tone="soft">{t('tanks.create.subtypeHint')}</AppText>
          <SubtypePicker
            householdId={householdId}
            onChange={(subtypeId) => setValues({
              ...values,
              subtypeId,
            })}
            tankType={tankType}
            value={values.subtypeId}
          />
          <View style={styles.actions}>
            <Button label={t('tanks.create.back')} onPress={() => setStep('type')} variant="soft" />
            <Button
              label={values.subtypeId === null ? t('tanks.create.skip') : t('tanks.create.next')}
              onPress={() => setStep('details')}
              testID="tank-create-next"
            />
          </View>
        </>
      ) : null}
      {step === 'details' && tankType !== null ? (
        <>
          <AppText accessibilityRole="header" variant="title">{t('tanks.create.detailsTitle')}</AppText>
          <TankDetailsForm errors={errors} onChange={setValues} values={values} />
          {create.isError ? <AppText tone="ambre">{t('tanks.form.failed')}</AppText> : null}
          <View style={styles.actions}>
            <Button label={t('tanks.create.back')} onPress={() => setStep('subtype')} variant="soft" />
            <Button
              label={t('tanks.create.submit')}
              loading={create.isPending}
              onPress={() => submit(tankType)}
              testID="tank-create-submit"
            />
          </View>
        </>
      ) : null}
    </>
  );
}

/** Type, then style, then details: one route, the steps held in memory. */
export function CreateTankScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { household, isPending, isError, refetch } = useCurrentHousehold();

  return (
    <Screen testID="create-tank-screen">
      <Stack.Screen options={{ title: t('tanks.create.title') }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
          {isError ? (
            <Surface>
              <AppText tone="ambre">{t('household.error')}</AppText>
              <Button label={t('common.retry')} onPress={refetch} variant="soft" />
            </Surface>
          ) : null}
          {!isPending && !isError && !household ? (
            <Surface>
              <AppText>{t('tanks.noHousehold')}</AppText>
            </Surface>
          ) : null}
          {household ? <Wizard householdId={household.id} /> : null}
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

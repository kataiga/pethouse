import { Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Surface } from '@/components/ui/surface';
import { useCurrentHousehold } from '@/features/households/hooks/use-households';
import {
  TANK_TYPES, type TankType,
} from '@/features/tanks/hooks/use-tanks';
import {
  space, useTheme,
} from '@/theme';
import { useDeleteDefinition } from '../hooks/use-definitions';
import {
  type Setting, useSaveSettings, useSettings,
} from '../hooks/use-settings';
import { definitionLabel } from '../labels';
import {
  draftFrom, type SettingDraft, settingChanges, type SettingErrors,
} from '../settings-form';
import { CustomDefinitionForm } from './custom-definition-form';
import { SettingRow } from './setting-row';

function SettingsForm ({ tankType, settings, householdId }: { tankType: TankType;
  settings: Setting[];
  householdId: number | null }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const save = useSaveSettings(tankType);
  const remove = useDeleteDefinition(householdId ?? -1);
  const [drafts, setDrafts] = useState<ReadonlyMap<number, SettingDraft>>(
    () => new Map(settings.map((setting) => [setting.definition.id, draftFrom(setting, i18n.language)])),
  );
  const [errors, setErrors] = useState<SettingErrors>({});
  const [saved, setSaved] = useState(false);

  const submit = (): void => {
    const changes = settingChanges(settings, drafts);

    if (!changes.ok) {
      setErrors(changes.errors);

      return;
    }
    setErrors({});
    if (changes.inputs.length === 0) {
      setSaved(true);

      return;
    }
    save.mutate(changes.inputs, { onSuccess: () => setSaved(true) });
  };

  const confirmDelete = (setting: Setting): void => {
    Alert.alert(
      t('parameters.custom.deleteTitle', { name: definitionLabel(setting.definition, t) }),
      t('parameters.custom.deleteBody'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('parameters.custom.delete'),
          style: 'destructive',
          onPress: () => remove.mutate(setting.definition.id),
        },
      ],
    );
  };

  return (
    <Surface testID="settings-form">
      {settings.map((setting) => {
        const id = setting.definition.id;
        const draft = drafts.get(id) ?? draftFrom(setting, i18n.language);

        return (
          <SettingRow
            draft={draft}
            errors={errors[id] ?? {}}
            key={id}
            onChange={(next) => {
              setSaved(false);
              setDrafts(new Map(drafts).set(id, next));
            }}
            onDelete={!setting.definition.isSystem && householdId !== null ? () => confirmDelete(setting) : undefined}
            setting={setting}
          />
        );
      })}
      {save.isError || remove.isError ? <AppText tone="ambre">{t('parameters.errors.failed')}</AppText> : null}
      {saved ? <Pill label={t('parameters.account.saved')} tone="done" /> : null}
      <Button
        label={t('parameters.account.save')}
        loading={save.isPending}
        onPress={submit}
        testID="settings-save"
      />
    </Surface>
  );
}

/** What the account tracks for each tank type, and the acceptable ranges every tank inherits. */
export function AccountParametersScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [tankType, setTankType] = useState<TankType>('AQUARIUM');
  const settings = useSettings(tankType);
  const { household } = useCurrentHousehold();

  return (
    <Screen testID="account-parameters-screen">
      <Stack.Screen options={{ title: t('parameters.account.title') }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText tone="soft">{t('parameters.account.explain')}</AppText>
          <SegmentedControl<TankType>
            label={t('parameters.account.tankType')}
            onChange={setTankType}
            options={TANK_TYPES.map((type) => ({
              value: type,
              label: t(`tanks.types.${type}`),
            }))}
            testID="settings-type"
            value={tankType}
          />
          {settings.isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
          {settings.isError ? (
            <Surface>
              <AppText tone="ambre">{t('parameters.account.error')}</AppText>
              <Button label={t('common.retry')} onPress={() => void settings.refetch()} variant="soft" />
            </Surface>
          ) : null}
          {settings.data ? (
            <SettingsForm
              householdId={household?.id ?? null}
              // A fresh form per type, and again once the list itself changes (a parameter added or removed).
              key={`${tankType}-${settings.data.map((setting) => setting.definition.id).join(',')}`}
              settings={settings.data}
              tankType={tankType}
            />
          ) : null}
          {household ? <CustomDefinitionForm householdId={household.id} /> : null}
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
});

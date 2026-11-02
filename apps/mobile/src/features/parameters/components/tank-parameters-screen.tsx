import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import {
  space, useTheme,
} from '@/theme';
import {
  useInheritParameter, useOverrideParameter, useTankParameters,
} from '../hooks/use-tank-parameters';
import { OverrideRow } from './override-row';

/** Every parameter for one tank, tracked or not, where the tank may deviate from the account. */
export function TankParametersScreen ({ tankId }: { tankId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const parameters = useTankParameters(tankId);
  const override = useOverrideParameter(tankId);
  const inherit = useInheritParameter(tankId);
  const busy = override.isPending || inherit.isPending;

  return (
    <Screen testID="tank-parameters-screen">
      <Stack.Screen options={{ title: t('parameters.manage.title') }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText tone="soft">{t('parameters.manage.explain')}</AppText>
          {parameters.isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
          {parameters.isError ? (
            <Surface>
              <AppText tone="ambre">{t('parameters.tank.error')}</AppText>
              <Button label={t('common.retry')} onPress={() => void parameters.refetch()} variant="soft" />
            </Surface>
          ) : null}
          {override.isError || inherit.isError ? <AppText tone="ambre">{t('parameters.errors.failed')}</AppText> : null}
          {parameters.data ? (
            <Surface>
              {parameters.data.map((parameter) => (
                <OverrideRow
                  // Re-seed the threshold fields whenever the stored deviation changes.
                  key={[
                    parameter.definition.id,
                    parameter.override?.minThreshold ?? '',
                    parameter.override?.maxThreshold ?? '',
                  ].join('-')}
                  busy={busy}
                  onInherit={() => inherit.mutate(parameter.definition.id)}
                  onOverride={(input) => override.mutate({
                    definitionId: parameter.definition.id,
                    input,
                  })}
                  parameter={parameter}
                />
              ))}
            </Surface>
          ) : null}
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

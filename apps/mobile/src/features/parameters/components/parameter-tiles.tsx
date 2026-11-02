import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { formatInstantDate } from '@/lib/i18n/format';
import {
  radius, space, useTheme,
} from '@/theme';
import {
  isAlerting, type ResolvedParameter, useTankParameters,
} from '../hooks/use-tank-parameters';
import { definitionLabel } from '../labels';
import {
  formatValue, withUnit,
} from '../range';

function Tile ({ tankId, parameter }: { tankId: number;
  parameter: ResolvedParameter }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { definition, latest } = parameter;
  const alert = isAlerting(parameter);
  const name = definitionLabel(definition, t);

  return (
    <Pressable
      accessibilityHint={alert ? t('parameters.tank.outOfRange') : undefined}
      accessibilityLabel={name}
      accessibilityRole="button"
      onPress={() => router.push(`/tanks/${tankId}/parameters/${definition.id}`)}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: alert ? colors.ambreVeil : colors.background,
          borderColor: alert ? colors.ambre : colors.line,
        },
        pressed && styles.pressed,
      ]}
      testID={`tile-${definition.slug}`}
    >
      <AppText numberOfLines={1} tone="soft" variant="caption">{name}</AppText>
      {latest ? (
        <>
          <AppText tone={alert ? 'ambre' : 'default'} variant="title">
            {withUnit(formatValue(latest.value, definition.decimals, i18n.language), definition.unit)}
          </AppText>
          <AppText tone={alert ? 'ambre' : 'soft'} variant="caption">
            {alert
              ? t('parameters.tank.outOfRange')
              : t('parameters.tank.measuredOn', { date: formatInstantDate(latest.measuredAt, i18n.language) })}
          </AppText>
        </>
      ) : (
        <AppText tone="soft">{t('parameters.tank.never')}</AppText>
      )}
    </Pressable>
  );
}

/** The latest reading of every tracked parameter; out-of-range ones in amber, never a notification. */
export function ParameterTiles ({ tankId }: { tankId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const parameters = useTankParameters(tankId);
  const tracked = parameters.data?.filter((parameter) => parameter.enabled) ?? [];

  return (
    <Surface testID="parameter-tiles">
      <View style={styles.header}>
        <AppText accessibilityRole="header" tone="soft" variant="label">{t('parameters.tank.title')}</AppText>
        <Pressable
          accessibilityRole="link"
          hitSlop={space.sm}
          onPress={() => router.push(`/tanks/${tankId}/parameters`)}
          testID="parameters-manage"
        >
          <AppText tone="lagon" variant="strong">{t('parameters.tank.manage')}</AppText>
        </Pressable>
      </View>
      {parameters.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
      {parameters.isError ? (
        <>
          <AppText tone="ambre">{t('parameters.tank.error')}</AppText>
          <Button label={t('common.retry')} onPress={() => void parameters.refetch()} variant="soft" />
        </>
      ) : null}
      {parameters.data && tracked.length === 0 ? <AppText tone="soft">{t('parameters.tank.empty')}</AppText> : null}
      <View style={styles.grid}>
        {tracked.map((parameter) => <Tile key={parameter.definition.id} parameter={parameter} tankId={tankId} />)}
      </View>
      {tracked.length > 0 ? (
        <Button
          label={t('parameters.tank.measure')}
          onPress={() => router.push(`/tanks/${tankId}/measure`)}
          testID="parameters-measure"
        />
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  tile: {
    width: '48.5%',
    gap: space.xs,
    padding: space.md,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  pressed: { opacity: 0.8 },
});

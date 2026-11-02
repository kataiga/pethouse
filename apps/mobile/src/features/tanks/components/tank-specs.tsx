import { useTranslation } from 'react-i18next';
import {
  Image, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { formatCalendarDate } from '@/lib/i18n/format';
import {
  radius, space,
} from '@/theme';
import type { Tank } from '../hooks/use-tanks';
import { subtypeLabel } from '../labels';
import { formatDecimal } from '../tank-form';

/** The cover, what the tank is, and the facts the person entered about it. */
export function TankSpecs ({ tank }: { tank: Tank }): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const number = (value: number): string => formatDecimal(value, i18n.language);
  const kind = [t(`tanks.types.${tank.tankType}`), tank.subtype ? subtypeLabel(tank.subtype, t) : null]
    .filter((part) => part !== null)
    .join(' · ');
  const { widthCm, depthCm, heightCm } = tank;
  const facts = [
    tank.volumeLiters === null ? null : t('tanks.volume', { volume: number(tank.volumeLiters) }),
    widthCm === null || depthCm === null || heightCm === null ? null : t('tanks.dimensions', {
      width: number(widthCm),
      depth: number(depthCm),
      height: number(heightCm),
    }),
    tank.substrate === null ? null : t('tanks.detail.substrate', { substrate: tank.substrate }),
    tank.startedAt === null ? null : t('tanks.detail.startedAt', {
      date: formatCalendarDate(tank.startedAt, i18n.language),
    }),
  ].filter((fact) => fact !== null);

  return (
    <View style={styles.block} testID="tank-specs">
      {tank.coverPhoto ? (
        <Image accessibilityIgnoresInvertColors source={{ uri: tank.coverPhoto.url }} style={styles.cover} />
      ) : null}
      <AppText tone="lagon" variant="label">{kind}</AppText>
      <AppText accessibilityRole="header" variant="display">{tank.name}</AppText>
      {facts.map((fact) => <AppText key={fact} tone="soft">{fact}</AppText>)}
      {tank.description !== null ? <AppText>{tank.description}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.xs },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.md,
    marginBottom: space.sm,
  },
});

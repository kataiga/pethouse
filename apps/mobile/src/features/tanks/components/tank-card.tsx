import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import {
  Image, Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import {
  radius, space, useTheme,
} from '@/theme';
import type { Tank } from '../hooks/use-tanks';
import {
  subtypeLabel, TANK_ICONS,
} from '../labels';
import { formatDecimal } from '../tank-form';

export interface TankCardProps {
  tank: Tank;
  onPress: () => void;
}

/** A tank in the list: its cover (or its type's icon), its name and what it is. */
export function TankCard ({ tank, onPress }: TankCardProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const kind = [t(`tanks.types.${tank.tankType}`), tank.subtype ? subtypeLabel(tank.subtype, t) : null]
    .filter((part) => part !== null)
    .join(' · ');

  return (
    <Pressable
      accessibilityLabel={tank.name}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface }, pressed && styles.pressed]}
      testID={`tank-${tank.id}`}
    >
      {tank.coverPhoto ? (
        <Image accessibilityIgnoresInvertColors source={{ uri: tank.coverPhoto.url }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.placeholder, { backgroundColor: colors.lagonVeil }]}>
          <Ionicons color={colors.lagon} name={TANK_ICONS[tank.tankType]} size={32} />
        </View>
      )}
      <View style={styles.text}>
        <AppText numberOfLines={1} variant="heading">{tank.name}</AppText>
        <AppText numberOfLines={1} tone="soft">{kind}</AppText>
        {tank.volumeLiters !== null ? (
          <AppText tone="soft" variant="caption">
            {t('tanks.volume', { volume: formatDecimal(tank.volumeLiters, i18n.language) })}
          </AppText>
        ) : null}
      </View>
      <Ionicons color={colors.inkSoft} name="chevron-forward" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
  },
  pressed: { opacity: 0.8 },
  cover: {
    width: 64,
    height: 64,
    borderRadius: radius.sm,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: space.xs,
  },
});

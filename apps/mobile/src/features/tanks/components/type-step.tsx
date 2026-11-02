import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import {
  Pressable, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import {
  radius, space, useTheme,
} from '@/theme';
import {
  TANK_TYPES, type TankType,
} from '../hooks/use-tanks';
import { TANK_ICONS } from '../labels';

export interface TypeStepProps {
  value: TankType | null;
  onSelect: (tankType: TankType) => void;
}

/** Aquarium, terrarium or paludarium: the one choice that cannot be changed later. */
export function TypeStep ({ value, onSelect }: TypeStepProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View accessibilityRole="radiogroup" style={styles.list}>
      {TANK_TYPES.map((tankType) => {
        const selected = tankType === value;

        return (
          <Pressable
            accessibilityLabel={t(`tanks.types.${tankType}`)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={tankType}
            onPress={() => onSelect(tankType)}
            style={[
              styles.card,
              {
                backgroundColor: selected ? colors.lagonVeil : colors.surface,
                borderColor: selected ? colors.lagon : colors.line,
              },
            ]}
            testID={`tank-type-${tankType}`}
          >
            <Ionicons color={colors.lagon} name={TANK_ICONS[tankType]} size={32} />
            <View style={styles.text}>
              <AppText variant="heading">{t(`tanks.types.${tankType}`)}</AppText>
              <AppText tone="soft">{t(`tanks.typeHints.${tankType}`)}</AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    padding: space.lg,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  text: {
    flex: 1,
    gap: space.xs,
  },
});

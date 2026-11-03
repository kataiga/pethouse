import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import {
  space, useTheme,
} from '@/theme';
import {
  useCreateSubtype, useSubtypes,
} from '../hooks/use-subtypes';
import type { TankType } from '../hooks/use-tanks';
import { subtypeLabel } from '../labels';
import { Chip } from '@/components/ui/chip';

export interface SubtypePickerProps {
  householdId: number;
  tankType: TankType;
  value: number | null;
  onChange: (subtypeId: number | null) => void;
}

/** The seeded styles of a tank type, the household's own, and a way to add one. */
export function SubtypePicker ({
  householdId, tankType, value, onChange,
}: SubtypePickerProps): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const subtypes = useSubtypes(tankType);
  const create = useCreateSubtype(householdId, tankType);
  const [custom, setCustom] = useState('');
  const name = custom.trim();

  return (
    <View style={styles.block}>
      {subtypes.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
      {subtypes.isError ? (
        <>
          <AppText tone="ambre">{t('tanks.subtype.error')}</AppText>
          <Button label={t('common.retry')} onPress={() => void subtypes.refetch()} variant="soft" />
        </>
      ) : null}
      {subtypes.data ? (
        <View accessibilityRole="radiogroup" style={styles.chips}>
          <Chip
            label={t('tanks.subtype.none')}
            onPress={() => onChange(null)}
            selected={value === null}
            testID="subtype-none"
          />
          {subtypes.data.map((subtype) => (
            <Chip
              key={subtype.id}
              label={subtypeLabel(subtype, t)}
              onPress={() => onChange(subtype.id)}
              selected={value === subtype.id}
              testID={`subtype-${subtype.slug}`}
            />
          ))}
        </View>
      ) : null}
      <TextField
        label={t('tanks.subtype.customLabel')}
        maxLength={60}
        onChangeText={setCustom}
        testID="subtype-custom"
        value={custom}
      />
      {create.isError ? <AppText tone="ambre">{t('tanks.subtype.customFailed')}</AppText> : null}
      <Button
        disabled={name === ''}
        label={t('tanks.subtype.customAdd')}
        loading={create.isPending}
        onPress={() => create.mutate(name, {
          onSuccess: (subtype) => {
            setCustom('');
            onChange(subtype.id);
          },
        })}
        testID="subtype-custom-add"
        variant="soft"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});

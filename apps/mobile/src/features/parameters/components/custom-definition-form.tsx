import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { useCreateDefinition } from '../hooks/use-definitions';

const DECIMALS = ['0', '1', '2', '3'] as const;

type Decimals = typeof DECIMALS[number];

/** A household's own parameter: a name, a unit, how many decimals a reading keeps. */
export function CustomDefinitionForm ({ householdId }: { householdId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const create = useCreateDefinition(householdId);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [decimals, setDecimals] = useState<Decimals>('1');
  const [touched, setTouched] = useState(false);
  const trimmed = name.trim();

  return (
    <Surface testID="custom-definition">
      <AppText variant="heading">{t('parameters.custom.title')}</AppText>
      <AppText tone="soft">{t('parameters.custom.explain')}</AppText>
      <TextField
        error={touched && trimmed === '' ? t('parameters.custom.nameRequired') : undefined}
        label={t('parameters.custom.name')}
        maxLength={60}
        onChangeText={setName}
        placeholder={t('parameters.custom.namePlaceholder')}
        testID="custom-definition-name"
        value={name}
      />
      <TextField
        autoCapitalize="none"
        label={t('parameters.custom.unit')}
        maxLength={16}
        onChangeText={setUnit}
        placeholder={t('parameters.custom.unitPlaceholder')}
        testID="custom-definition-unit"
        value={unit}
      />
      <SegmentedControl<Decimals>
        label={t('parameters.custom.decimals')}
        onChange={setDecimals}
        options={DECIMALS.map((value) => ({
          value,
          label: value,
        }))}
        testID="custom-definition-decimals"
        value={decimals}
      />
      {create.error ? (
        <AppText tone="ambre">
          {create.error.failure === 'duplicate' ? t('parameters.custom.duplicate') : t('parameters.errors.failed')}
        </AppText>
      ) : null}
      <View>
        <Button
          label={t('parameters.custom.add')}
          loading={create.isPending}
          onPress={() => {
            setTouched(true);
            if (trimmed !== '') {
              create.mutate({
                name: trimmed,
                unit: unit.trim(),
                decimals: Number(decimals),
              }, {
                onSuccess: () => {
                  setName('');
                  setUnit('');
                  setTouched(false);
                },
              });
            }
          }}
          testID="custom-definition-add"
          variant="soft"
        />
      </View>
    </Surface>
  );
}

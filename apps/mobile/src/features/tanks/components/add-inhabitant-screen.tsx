import {
  router, Stack,
} from 'expo-router';
import {
  useEffect, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import {
  radius, space, useTheme,
} from '@/theme';
import {
  type InhabitantKind, useAddInhabitant,
} from '../hooks/use-inhabitants';
import {
  ANIMAL_GROUPS, type AnimalGroup, type SpeciesHit, useSpeciesSearch,
} from '../hooks/use-species-search';
import { parseQuantity } from '../quantity';
import { Chip } from './chip';

const SEARCH_DELAY_MS = 300;

/** The value once it has stopped changing for a moment, so typing does not fire a request per key. */
function useDebounced<T> (value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}

function Quantity ({ tankId, kind, species, onChange }: { tankId: number;
  kind: InhabitantKind;
  species: SpeciesHit;
  onChange: () => void }): React.JSX.Element {
  const { t } = useTranslation();
  const add = useAddInhabitant(tankId, kind);
  const [quantity, setQuantity] = useState('1');
  const parsed = parseQuantity(quantity);

  return (
    <Surface testID="inhabitant-selected">
      <AppText variant="heading">{species.commonName}</AppText>
      <AppText style={styles.scientific} tone="soft" variant="caption">{species.scientificName}</AppText>
      <TextField
        error={parsed === null ? t('tanks.inhabitants.invalidQuantity') : undefined}
        inputMode="numeric"
        keyboardType="number-pad"
        label={t('tanks.inhabitants.quantity')}
        onChangeText={setQuantity}
        testID="inhabitant-quantity"
        value={quantity}
      />
      {add.isError ? <AppText tone="ambre">{t('tanks.addInhabitant.failed')}</AppText> : null}
      <View style={styles.actions}>
        <Button label={t('tanks.addInhabitant.change')} onPress={onChange} variant="soft" />
        <Button
          disabled={parsed === null}
          label={t('tanks.addInhabitant.submit')}
          loading={add.isPending}
          onPress={() => {
            if (parsed !== null) {
              add.mutate({
                speciesId: species.id,
                quantity: parsed,
              }, { onSuccess: () => router.back() });
            }
          }}
          testID="inhabitant-submit"
        />
      </View>
    </Surface>
  );
}

/** Search the animal or plant catalogue, pick a species, say how many. */
export function AddInhabitantScreen ({ tankId, initialKind }: { tankId: number;
  initialKind: InhabitantKind }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [kind, setKind] = useState<InhabitantKind>(initialKind);
  const [search, setSearch] = useState('');
  const [animalGroup, setAnimalGroup] = useState<AnimalGroup | null>(null);
  const [selected, setSelected] = useState<SpeciesHit | null>(null);
  const term = useDebounced(search, SEARCH_DELAY_MS);
  const results = useSpeciesSearch({
    kind,
    search: term,
    animalGroup: kind === 'animals' ? animalGroup : null,
  });
  const hits = results.data?.hits ?? [];
  const more = (results.data?.total ?? 0) - hits.length;

  return (
    <Screen testID="add-inhabitant-screen">
      <Stack.Screen options={{ title: t('tanks.addInhabitant.title') }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <SegmentedControl
            label={t('tanks.addInhabitant.kind')}
            onChange={(next) => {
              setKind(next);
              setSelected(null);
            }}
            options={[
              {
                value: 'animals',
                label: t('tanks.inhabitants.animals'),
              },
              {
                value: 'plants',
                label: t('tanks.inhabitants.plants'),
              },
            ]}
            testID="inhabitant-kind"
            value={kind}
          />
          {selected ? (
            <Quantity kind={kind} onChange={() => setSelected(null)} species={selected} tankId={tankId} />
          ) : (
            <>
              <TextField
                autoCorrect={false}
                label={t('tanks.addInhabitant.search')}
                onChangeText={setSearch}
                placeholder={t('tanks.addInhabitant.searchPlaceholder')}
                testID="species-search"
                value={search}
              />
              {kind === 'animals' ? (
                <View accessibilityRole="radiogroup" style={styles.chips}>
                  <Chip
                    label={t('tanks.addInhabitant.allGroups')}
                    onPress={() => setAnimalGroup(null)}
                    selected={animalGroup === null}
                    testID="group-all"
                  />
                  {ANIMAL_GROUPS.map((group) => (
                    <Chip
                      key={group}
                      label={t(`tanks.addInhabitant.groups.${group}`)}
                      onPress={() => setAnimalGroup(group)}
                      selected={animalGroup === group}
                      testID={`group-${group}`}
                    />
                  ))}
                </View>
              ) : null}
              {results.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
              {results.isError ? (
                <Surface>
                  <AppText tone="ambre">{t('tanks.addInhabitant.error')}</AppText>
                  <Button label={t('common.retry')} onPress={() => void results.refetch()} variant="soft" />
                </Surface>
              ) : null}
              {results.data && hits.length === 0
                ? <AppText tone="soft">{t('tanks.addInhabitant.noResults')}</AppText>
                : null}
              {hits.map((hit) => (
                <Pressable
                  accessibilityRole="button"
                  key={hit.id}
                  onPress={() => setSelected(hit)}
                  style={({ pressed }) => [styles.hit, {
                    backgroundColor: colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  }]}
                  testID={`species-${hit.id}`}
                >
                  <AppText variant="heading">{hit.commonName}</AppText>
                  <AppText style={styles.scientific} tone="soft" variant="caption">{hit.scientificName}</AppText>
                </Pressable>
              ))}
              {more > 0 ? <AppText tone="soft">{t('tanks.addInhabitant.more', { count: more })}</AppText> : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    gap: space.md,
    paddingBottom: space.xxl,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  hit: {
    gap: space.xs,
    padding: space.md,
    borderRadius: radius.sm,
  },
  scientific: { fontStyle: 'italic' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
  },
});

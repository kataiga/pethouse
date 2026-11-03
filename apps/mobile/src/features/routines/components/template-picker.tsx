import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Pressable, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import type { TankType } from '@/features/tanks/hooks/use-tanks';
import {
  radius, space, useTheme,
} from '@/theme';
import {
  type RoutineTemplate, useTemplates,
} from '../hooks/use-templates';
import { templateTexts } from '../labels';
import { ruleText } from '../rule-text';

export interface TemplatePickerProps {
  tankType: TankType;
  startDate: string;
  onPick: (template: RoutineTemplate) => void;
  onScratch: () => void;
}

/** Common routines for the tank's type, each with its suggested rule, or a blank one. */
export function TemplatePicker ({
  tankType, startDate, onPick, onScratch,
}: TemplatePickerProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const templates = useTemplates(tankType);

  return (
    <>
      <AppText accessibilityRole="header" variant="title">{t('routines.create.pick')}</AppText>
      <AppText tone="soft">{t('routines.create.pickExplain')}</AppText>
      {templates.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
      {templates.isError ? (
        <Surface>
          <AppText tone="ambre">{t('routines.create.error')}</AppText>
          <Button label={t('common.retry')} onPress={() => void templates.refetch()} variant="soft" />
        </Surface>
      ) : null}
      {templates.data?.map((template) => {
        const texts = templateTexts(template.nameKey, t);

        return (
          <Pressable
            accessibilityLabel={texts.name}
            accessibilityRole="button"
            key={template.id}
            onPress={() => onPick(template)}
            style={({ pressed }) => [styles.card, {
              backgroundColor: colors.surface,
              opacity: pressed ? 0.8 : 1,
            }]}
            testID={`template-${template.id}`}
          >
            <AppText variant="heading">{texts.name}</AppText>
            {texts.description !== '' ? <AppText tone="soft">{texts.description}</AppText> : null}
            <AppText tone="lagon" variant="caption">
              {ruleText(template.defaultRrule, `${startDate}T09:00`, t, i18n.language)}
            </AppText>
          </Pressable>
        );
      })}
      <Button label={t('routines.create.scratch')} onPress={onScratch} testID="template-scratch" variant="soft" />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.xs,
    padding: space.lg,
    borderRadius: radius.md,
  },
});

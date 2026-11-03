import {
  router, Stack,
} from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { useTank } from '@/features/tanks/hooks/use-tanks';
import { todayCalendarDate } from '@/lib/i18n/format';
import {
  space, useTheme,
} from '@/theme';
import {
  type Routine, type RoutineError, useCreateRoutine, useRoutine, useUpdateRoutine,
} from '../hooks/use-routines';
import { templateTexts } from '../labels';
import {
  blankDraft, draftFromRoutine, draftFromTemplate, NAME_MAX_LENGTH, type RoutineBody, type RoutineDraft, scheduleOf,
  validateRoutine,
} from '../routine-form';
import { PreviewList } from './preview-list';
import { RecurrenceEditor } from './recurrence-editor';
import { ReminderFields } from './reminder-fields';
import { TemplatePicker } from './template-picker';

interface FormProps {
  tankId: number;
  initial: RoutineDraft;
  submitLabel: string;
  saving: boolean;
  error: RoutineError | null;
  onSubmit: (body: RoutineBody) => void;
}

function RoutineForm ({
  tankId, initial, submitLabel, saving, error, onSubmit,
}: FormProps): React.JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const schedule = scheduleOf(draft);
  const result = validateRoutine(draft);

  return (
    <>
      <TextField
        error={submitted && draft.name.trim() === '' ? t('routines.form.nameRequired') : undefined}
        label={t('routines.form.name')}
        maxLength={NAME_MAX_LENGTH}
        onChangeText={(name) => setDraft({
          ...draft,
          name,
        })}
        placeholder={t('routines.form.namePlaceholder')}
        testID="routine-name"
        value={draft.name}
      />
      <TextField
        label={t('routines.form.description')}
        maxLength={500}
        multiline
        onChangeText={(description) => setDraft({
          ...draft,
          description,
        })}
        testID="routine-description"
        value={draft.description}
      />
      <Surface>
        <AppText accessibilityRole="header" variant="heading">{t('routines.recurrence.title')}</AppText>
        <RecurrenceEditor
          onChange={(rule) => setDraft({
            ...draft,
            rule,
          })}
          showErrors={submitted}
          startDate={draft.startDate}
          value={draft.rule}
        />
        <DateField
          label={t('routines.form.start')}
          onChange={(startDate) => setDraft({
            ...draft,
            startDate: startDate ?? draft.startDate,
          })}
          placeholder={t('routines.form.start')}
          testID="routine-start"
          value={draft.startDate}
        />
        <PreviewList schedule={'error' in schedule ? null : schedule} tankId={tankId} />
      </Surface>
      <Surface>
        <ReminderFields
          every={draft.reminderEvery}
          max={draft.reminderMax}
          onChange={({ remind, every, max }) => setDraft({
            ...draft,
            remind,
            reminderEvery: every,
            reminderMax: max,
          })}
          remind={draft.remind}
        />
      </Surface>
      {error ? (
        <AppText tone="ambre">
          {error.failure === 'rejected' ? t('routines.form.rejected') : t('routines.form.failed')}
        </AppText>
      ) : null}
      <Button
        label={submitLabel}
        loading={saving}
        onPress={() => {
          setSubmitted(true);
          if (result.ok) {
            onSubmit(result.body);
          }
        }}
        testID="routine-submit"
      />
    </>
  );
}

function CreateFlow ({ tankId }: { tankId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const tank = useTank(tankId);
  const create = useCreateRoutine(tankId);
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const today = todayCalendarDate();

  if (tank.isPending) {
    return <ActivityIndicator color={colors.lagon} size="large" />;
  }

  if (!tank.data) {
    return (
      <Surface>
        <AppText>{t('tanks.detail.notFound')}</AppText>
      </Surface>
    );
  }

  if (draft === null) {
    return (
      <TemplatePicker
        onPick={(template) => {
          const texts = templateTexts(template.nameKey, t);
          setDraft(draftFromTemplate(template.defaultRrule, texts.name, texts.description, today));
        }}
        onScratch={() => setDraft(blankDraft(new Date(), today))}
        startDate={today}
        tankType={tank.data.tankType}
      />
    );
  }

  return (
    <RoutineForm
      error={create.error}
      initial={draft}
      onSubmit={(body) => create.mutate(body, {
        onSuccess: (routine) => router.replace(`/tanks/${tankId}/routines/${routine.id}`),
      })}
      saving={create.isPending}
      submitLabel={t('routines.form.create')}
      tankId={tankId}
    />
  );
}

function EditFlow ({ tankId, routine }: { tankId: number;
  routine: Routine }): React.JSX.Element {
  const { t } = useTranslation();
  const update = useUpdateRoutine(tankId, routine.id);

  return (
    <RoutineForm
      error={update.error}
      initial={draftFromRoutine(routine)}
      onSubmit={(body) => update.mutate(body, {
        // Opened from a link, the form has nothing to go back to: land on the routine instead.
        onSuccess: () => (router.canGoBack()
          ? router.back()
          : router.replace(`/tanks/${tankId}/routines/${routine.id}`)),
      })}
      saving={update.isPending}
      submitLabel={t('routines.form.save')}
      tankId={tankId}
    />
  );
}

function EditLoader ({ tankId, routineId }: { tankId: number;
  routineId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const routine = useRoutine(tankId, routineId);

  if (routine.isPending) {
    return <ActivityIndicator color={colors.lagon} size="large" />;
  }

  if (routine.isError) {
    return (
      <Surface>
        <AppText tone="ambre">{t('routines.detail.error')}</AppText>
        <Button label={t('common.retry')} onPress={() => void routine.refetch()} variant="soft" />
      </Surface>
    );
  }

  return routine.data ? <EditFlow routine={routine.data} tankId={tankId} /> : (
    <Surface>
      <AppText>{t('routines.detail.notFound')}</AppText>
    </Surface>
  );
}

/** Creates a routine (template first, or from scratch) or edits one, with a live preview. */
export function RoutineFormScreen ({ tankId, routineId }: { tankId: number;
  routineId?: number }): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <Screen testID="routine-form-screen">
      <Stack.Screen
        options={{ title: routineId === undefined ? t('routines.create.title') : t('routines.form.editTitle') }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {routineId === undefined
            ? <CreateFlow tankId={tankId} />
            : <EditLoader routineId={routineId} tankId={tankId} />}
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

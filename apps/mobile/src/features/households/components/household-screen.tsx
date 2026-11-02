import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, ScrollView, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import { TextField } from '@/components/ui/text-field';
import { useSession } from '@/features/auth/hooks/session-context';
import {
  space, useTheme,
} from '@/theme';
import {
  type Household, useCurrentHousehold, useRenameHousehold,
} from '../hooks/use-households';
import {
  useChangeRole, useMembers, useRemoveMember,
} from '../hooks/use-members';
import { MemberRow } from './member-row';

function Rename ({ household, onDone }: { household: Household;
  onDone: () => void }): React.JSX.Element {
  const { t } = useTranslation();
  const rename = useRenameHousehold(household.id);
  const [name, setName] = useState(household.name);
  const trimmed = name.trim();

  return (
    <View style={styles.block}>
      <TextField
        error={trimmed.length === 0 ? t('household.rename.required') : undefined}
        label={t('household.rename.label')}
        maxLength={80}
        onChangeText={setName}
        testID="household-name"
        value={name}
      />
      {rename.isError ? <Pill label={t('household.errors.failed')} tone="late" /> : null}
      <View style={styles.inline}>
        <Button
          disabled={trimmed.length === 0}
          label={t('common.save')}
          loading={rename.isPending}
          onPress={() => rename.mutate(trimmed, { onSuccess: onDone })}
          testID="household-name-save"
        />
        <Button label={t('common.cancel')} onPress={onDone} variant="soft" />
      </View>
    </View>
  );
}

function Members ({ household, selfId }: { household: Household;
  selfId: number }): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const members = useMembers(household.id);
  const changeRole = useChangeRole(household.id);
  const remove = useRemoveMember(household.id);
  const failure = changeRole.error?.failure ?? remove.error?.failure;

  return (
    <Surface testID="members">
      <AppText tone="soft" variant="label">{t('household.members.title')}</AppText>
      {members.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
      {members.isError ? (
        <>
          <AppText tone="ambre">{t('household.members.error')}</AppText>
          <Button label={t('common.retry')} onPress={() => void members.refetch()} variant="soft" />
        </>
      ) : null}
      {failure ? <Pill label={t(`household.errors.${failure}`)} tone="late" /> : null}
      {members.data?.map((member) => (
        <MemberRow
          busy={changeRole.isPending || remove.isPending}
          canManage={household.role === 'OWNER'}
          isSelf={member.userId === selfId}
          key={member.userId}
          member={member}
          onChangeRole={(role) => changeRole.mutate({
            userId: member.userId,
            role,
          })}
          onRemove={() => remove.mutate(member.userId)}
        />
      ))}
    </Surface>
  );
}

/** The current household: its name, its people, and the way in for new ones. */
export function HouseholdScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const session = useSession();
  const { household, isPending, isError, refetch } = useCurrentHousehold();
  const [renaming, setRenaming] = useState(false);
  const selfId = session.status === 'signedIn' ? session.user.id : -1;

  return (
    <Screen testID="household-screen">
      <ScrollView contentContainerStyle={styles.content}>
        {isPending ? <ActivityIndicator color={colors.lagon} size="large" /> : null}
        {isError ? (
          <Surface>
            <AppText tone="ambre">{t('household.error')}</AppText>
            <Button label={t('common.retry')} onPress={refetch} variant="soft" />
          </Surface>
        ) : null}
        {!isPending && !isError && !household ? (
          <Surface>
            <AppText>{t('household.none')}</AppText>
          </Surface>
        ) : null}
        {household ? (
          <>
            <View style={styles.block}>
              <AppText tone="lagon" variant="label">{t('household.eyebrow')}</AppText>
              {renaming ? (
                <Rename household={household} onDone={() => setRenaming(false)} />
              ) : (
                <>
                  <AppText accessibilityRole="header" variant="display">{household.name}</AppText>
                  <AppText tone="soft">{t('household.timezone', { zone: household.timezone })}</AppText>
                  {household.role === 'OWNER' ? (
                    <Button
                      label={t('household.rename.action')}
                      onPress={() => setRenaming(true)}
                      testID="household-rename"
                      variant="soft"
                    />
                  ) : null}
                </>
              )}
            </View>
            <Members household={household} selfId={selfId} />
            {household.role === 'OWNER' ? (
              <Button
                label={t('household.invite.action')}
                onPress={() => router.push('/household/invite')}
                testID="household-invite"
              />
            ) : null}
          </>
        ) : null}
        <Button
          label={t('household.join.action')}
          onPress={() => router.push('/household/join')}
          testID="household-join"
          variant="soft"
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  block: { gap: space.sm },
  inline: {
    flexDirection: 'row',
    gap: space.sm,
  },
});

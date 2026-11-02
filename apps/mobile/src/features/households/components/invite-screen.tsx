import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, ScrollView, Share, StyleSheet, View,
} from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Screen } from '@/components/ui/screen';
import { Surface } from '@/components/ui/surface';
import {
  space, useTheme,
} from '@/theme';
import { useCurrentHousehold } from '../hooks/use-households';
import {
  type Invite, useCreateInvite, useInvites, useRevokeInvite,
} from '../hooks/use-invites';

function InviteCard ({ invite, householdName, onRevoke, revoking }: {
  invite: Invite;
  householdName: string;
  onRevoke: () => void;
  revoking: boolean;
}): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const expires = new Date(invite.expiresAt).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'long',
  });

  return (
    <Surface testID={`invite-${invite.id}`}>
      <AppText selectable variant="title">{invite.code}</AppText>
      <AppText selectable tone="soft" variant="caption">{invite.url}</AppText>
      <AppText tone="soft">
        {t('household.invite.usage', {
          used: invite.useCount,
          max: invite.maxUses,
          date: expires,
        })}
      </AppText>
      <View style={styles.inline}>
        <Button
          label={t('household.invite.share')}
          onPress={() => void Share.share({
            message: t('household.invite.shareMessage', {
              household: householdName,
              url: invite.url,
              code: invite.code,
            }),
          })}
          testID={`invite-${invite.id}-share`}
        />
        <Button
          label={t('household.invite.revoke')}
          loading={revoking}
          onPress={onRevoke}
          testID={`invite-${invite.id}-revoke`}
          variant="soft"
        />
      </View>
    </Surface>
  );
}

/** Owners create a link, share it, and revoke the ones they no longer want used. */
export function InviteScreen (): React.JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { household } = useCurrentHousehold();
  const householdId = household?.id ?? -1;
  const invites = useInvites(householdId);
  const create = useCreateInvite(householdId);
  const revoke = useRevokeInvite(householdId);
  const active = invites.data?.filter((invite) => invite.active) ?? [];

  return (
    <Screen testID="invite-screen">
      <Stack.Screen options={{ title: t('household.invite.title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppText tone="soft">{t('household.invite.explain')}</AppText>
        <Button
          label={t('household.invite.create')}
          loading={create.isPending}
          onPress={() => create.mutate()}
          testID="invite-create"
        />
        {create.isError || revoke.isError ? <Pill label={t('household.errors.failed')} tone="late" /> : null}
        {invites.isPending ? <ActivityIndicator color={colors.lagon} /> : null}
        {invites.isError ? (
          <>
            <AppText tone="ambre">{t('household.invite.error')}</AppText>
            <Button label={t('common.retry')} onPress={() => void invites.refetch()} variant="soft" />
          </>
        ) : null}
        {invites.data && active.length === 0 ? <AppText tone="soft">{t('household.invite.empty')}</AppText> : null}
        {active.map((invite) => (
          <InviteCard
            householdName={household?.name ?? ''}
            invite={invite}
            key={invite.id}
            onRevoke={() => revoke.mutate(invite.id)}
            revoking={revoke.isPending && revoke.variables === invite.id}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.lg },
  inline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
